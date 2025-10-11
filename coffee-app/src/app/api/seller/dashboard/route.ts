export const runtime = 'node';


import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { Prisma } from '@prisma/client'; // ✅ التعديل المهم هنا

// ✅ Helper function لاستخراج sellerId بأمان
function getSellerId(authResult: any): string | null {
  if (authResult instanceof NextResponse) return null;
  return authResult.userId || authResult.user?.id || authResult.id || null;
}

/**
 * ✅ GET: جلب بيانات لوحة تحكم البائع
 * المسار: /api/seller/dashboard
 * يتطلب: مصادقة البائع
 */
export async function GET(request: Request) {
  // 1. التحقق من المصادقة
  const authResult = await authenticateToken(request as any);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const sellerId = getSellerId(authResult);
  if (!sellerId) {
    return NextResponse.json(
      { error: 'Authentication payload is missing user ID.' },
      { status: 401 }
    );
  }

  try {
    // 2. جلب الوردية النشطة
    const activeShift = await db.shift.findFirst({
      where: {
        sellerId,
        endTime: null,
      },
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        startTime: true,
        shiftType: true,
        startingCash: true,
        seller: {
          select: { name: true, email: true },
        },
      },
    });

    if (!activeShift) {
      return NextResponse.json(
        {
          message: 'No active shift. Please start a new shift to begin selling.',
          data: null,
        },
        { status: 200 }
      );
    }

    // 3. ملخص المبيعات للوردية الحالية
    const saleSummary = await db.sale.aggregate({
      _sum: {
        totalAmount: true,
        subtotal: true,
        vatAmount: true,
        feeAmount: true,
      },
      _count: {
        id: true, // عدد الفواتير
      },
      where: {
        shiftId: activeShift.id,
      },
    });

    // ✅ 4. إعداد البيانات النهائية
    const dashboardData = {
      activeShift,
      shiftSummary: {
        salesCount: saleSummary._count.id,
        totalRevenue: saleSummary._sum.totalAmount || new Prisma.Decimal(0),
        totalSubtotal: saleSummary._sum.subtotal || new Prisma.Decimal(0),
        totalVAT: saleSummary._sum.vatAmount || new Prisma.Decimal(0),
        totalFees: saleSummary._sum.feeAmount || new Prisma.Decimal(0),
      },
    };

    return NextResponse.json(dashboardData, { status: 200 });
  } catch (error) {
    console.error('Error fetching seller dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error while fetching dashboard data.' },
      { status: 500 }
    );
  }
}