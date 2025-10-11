
export const runtime = 'node';

import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

/**
 * GET: جلب أفضل المنتجات خلال فترة زمنية محددة.
 * المسار: /api/admin/reports/top-products
 * الحماية: يتطلب دور 'admin'
 * يمكن التصفية باستخدام: fromDate و toDate (كـ Query Params)
 */
export async function GET(request: Request) {
    // 1️⃣ التحقق من المصادقة: يتطلب دور 'admin' فقط
    const auth = await authenticateToken(request as any, 'admin');
    if (auth instanceof NextResponse) return auth;

    try {
        const { searchParams } = new URL(request.url);
        const fromDateParam = searchParams.get('fromDate');
        const toDateParam = searchParams.get('toDate');

        // بناء فلتر التاريخ
        const dateFilter: { saleTime?: { gte?: Date; lte?: Date } } = {};

        if (fromDateParam) {
            const fromDate = new Date(fromDateParam);
            if (!isNaN(fromDate.getTime())) {
                dateFilter.saleTime = { gte: fromDate };
            }
        }

        if (toDateParam) {
            const toDate = new Date(toDateParam);
            if (!isNaN(toDate.getTime())) {
                // لضمان تضمين كامل يوم النهاية
                const nextDay = new Date(toDate.getTime() + 24 * 60 * 60 * 1000); 
                dateFilter.saleTime = { ...dateFilter.saleTime, lte: nextDay };
            }
        }

        // 2️⃣ جلب أفضل 5 منتجات (زيادة العدد للمشرف) بناءً على الفلتر
        const topProducts = await db.saleItem.groupBy({
            by: ['productName'],
            _sum: { quantity: true },
            where: {
                sale: {
                    // ربط الفلتر بجدول المبيعات (Sale)
                    ...dateFilter 
                }
            },
            orderBy: {
                _sum: { quantity: 'desc' },
            },
            take: 5, // يمكن زيادة هذا العدد ليناسب تقرير المشرف
        });

        // 3️⃣ تهيئة البيانات
        const formattedTopProducts = topProducts.map(p => ({
            productName: p.productName,
            totalQuantity: p._sum.quantity || 0,
        }));

        return NextResponse.json(formattedTopProducts, { status: 200 });
    } catch (error) {
        console.error('Admin Top Products Report Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}