export const runtime = 'node';

import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(request: Request) {
  // 1️⃣ التعديل هنا: السماح لدور 'admin' أو 'seller' بالوصول
  const auth = await authenticateToken(request as any, ['admin', 'seller']);
  if (auth instanceof NextResponse) return auth;

  try {
    // 2️⃣ جلب أفضل 3 منتجات حسب الكمية المباعة
    const topProducts = await db.saleItem.groupBy({
      by: ['productName'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 3,
    });

    // 3️⃣ تحويل القيم المحتملة إلى أرقام لضمان التوافق مع الواجهة
    const formattedTopProducts = topProducts.map(p => ({
      productName: p.productName,
      totalQuantity: p._sum.quantity || 0,
    }));

    return NextResponse.json(formattedTopProducts, { status: 200 });
  } catch (error) {
    console.error('Error fetching top products:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}