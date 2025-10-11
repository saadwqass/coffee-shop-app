export const runtime = 'node';

import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(request: Request) {
  // 1️⃣ التحقق من المصادقة
  const auth = await authenticateToken(request as any, ['admin', 'seller']);
  if (auth instanceof NextResponse) return auth;

  try {
    // 2️⃣ ضبط تاريخ اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3️⃣ جلب جميع المبيعات اليوم
    const sales = await db.sale.findMany({
      where: { saleTime: { gte: today } },
      select: { totalAmount: true, vatAmount: true, feeAmount: true },
    });

    // 4️⃣ حساب الإجماليات
    const totalSales = sales.reduce((acc, s) => acc + (s.totalAmount?.toNumber() || 0), 0);
    const totalVat = sales.reduce((acc, s) => acc + (s.vatAmount?.toNumber() || 0), 0);
    const totalFees = sales.reduce((acc, s) => acc + (s.feeAmount?.toNumber() || 0), 0);

    return NextResponse.json({
      date: today.toISOString().split('T')[0],
      totalSales,
      totalVat,
      totalFees,
      saleCount: sales.length,
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating daily report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}