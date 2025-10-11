export const runtime = 'node';

import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * GET: تقرير المبيعات الإجمالي (الإيرادات، الضرائب، الرسوم)
 * المسار: /api/admin/reports/sales
 * الحماية: يتطلب دور 'admin'
 * يمكن تصفية النتائج باستخدام: fromDate و toDate (كـ Query Params)
 */
export async function GET(request: Request) {
    // 1. التحقق من المصادقة والدور
    const authResult = await authenticateToken(request as any, 'admin');
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const fromDateParam = searchParams.get('fromDate');
        const toDateParam = searchParams.get('toDate');

        const filter: { saleTime?: { gte?: Date; lte?: Date } } = {};

        // 2. التحقق من صحة التواريخ
        if (fromDateParam) {
            const fromDate = new Date(fromDateParam);
            if (!isNaN(fromDate.getTime())) {
                filter.saleTime = { gte: fromDate };
            }
        }

        if (toDateParam) {
            const toDate = new Date(toDateParam);
            if (!isNaN(toDate.getTime())) {
                const nextDay = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);
                filter.saleTime = { ...filter.saleTime, lte: nextDay };
            }
        }

        // 3. جلب جميع سجلات المبيعات التي تتوافق مع الفلتر
        const sales = await db.sale.findMany({
            where: filter,
            orderBy: { saleTime: 'desc' },
            include: {
                seller: { select: { name: true } },
                items: { select: { productName: true, quantity: true, subtotal: true } },
            },
        });

        // 4. حساب الإجماليات المطلوبة للتقرير
        const summary = await db.sale.aggregate({
            _sum: {
                totalAmount: true,
                subtotal: true,
                vatAmount: true,
                feeAmount: true,
            },
            _count: { id: true },
            where: filter,
        });

        // 5. تجهيز بيانات الرسم البياني اليومية
        const dailyRevenueRaw = await db.sale.findMany({
            where: filter,
            select: { saleTime: true, totalAmount: true },
            orderBy: { saleTime: 'asc' },
        });

        // تجميع الإيرادات حسب اليوم
        const dailyRevenueMap = new Map<string, Decimal>();
        dailyRevenueRaw.forEach(sale => {
            const day = sale.saleTime.toISOString().split('T')[0];
            const current = dailyRevenueMap.get(day) || new Decimal(0);
            dailyRevenueMap.set(day, current.add(sale.totalAmount));
        });

        const chartData = Array.from(dailyRevenueMap.entries()).map(([date, revenue]) => ({
            date,
            revenue,
        }));

        return NextResponse.json({
            summary: {
                totalSalesCount: summary._count.id,
                grossRevenue: summary._sum.totalAmount || new Decimal(0),
                totalSubtotal: summary._sum.subtotal || new Decimal(0),
                totalVAT: summary._sum.vatAmount || new Decimal(0),
                totalFees: summary._sum.feeAmount || new Decimal(0),
            },
            salesList: sales,
            revenueChartData: chartData,
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching sales report:', error);
        return NextResponse.json({ error: 'Internal Server Error while fetching sales report.' }, { status: 500 });
    }
}