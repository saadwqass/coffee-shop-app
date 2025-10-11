export const runtime = 'node';

import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

const VAT_RATE = 0.15;
const VAT_SPLIT_RATE = 1 + VAT_RATE;
const FEES = { cash: 0, mada: 0.00695, visa_master: 0.0225 };

interface SaleItemInput {
  productId: string;
  quantity: number;
}

export async function POST(request: Request) {
  // 1️⃣ التحقق من المصادقة
  const auth = await authenticateToken(request as any, 'seller');
  if (auth instanceof NextResponse) return auth;

  const sellerId = auth.user.userId;
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller ID not found in authentication payload.' }, { status: 401 });
  }

  try {
    // 2️⃣ جلب بيانات البيع من الجسم
    const body = await request.json() as {
      shiftId?: string;
      items?: SaleItemInput[];
      paymentMethod?: 'cash' | 'mada' | 'visa_master';
    };

    const { shiftId, items, paymentMethod } = body;

    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required.' }, { status: 400 });
    }

    if (!items || !items.length) {
      return NextResponse.json({ error: 'Sale items are required.' }, { status: 400 });
    }

    if (!paymentMethod || !(paymentMethod in FEES)) {
      return NextResponse.json({ error: 'Invalid or missing payment method.' }, { status: 400 });
    }

    // 3️⃣ التحقق من ملكية الوردية
    const shift = await db.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.sellerId !== sellerId) {
      return NextResponse.json({ error: 'Invalid shift or unauthorized.' }, { status: 403 });
    }

    // 4️⃣ جلب المنتجات من قاعدة البيانات
    const productIds = items.map(i => i.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== items.length) {
      return NextResponse.json({ error: 'One or more products not found.' }, { status: 404 });
    }

    // 5️⃣ حساب المبالغ
    let totalAmount = 0;
    const saleItems = items.map(i => {
      const product = products.find(p => p.id === i.productId)!;
      const priceNumber = product.price.toNumber();
      const itemTotal = priceNumber * i.quantity;
      totalAmount += itemTotal;

      const priceExVAT = priceNumber / VAT_SPLIT_RATE;

      return {
        productId: product.id,
        productName: product.name,
        priceAtSale: product.price,
        quantity: i.quantity,
        subtotal: new Prisma.Decimal(priceExVAT * i.quantity),
      };
    });

    const subtotal = totalAmount / VAT_SPLIT_RATE;
    const vatAmount = totalAmount - subtotal;
    const feeAmount = subtotal * (FEES[paymentMethod] ?? 0);

    // 6️⃣ إنشاء البيع وتحديث المخزون ضمن معاملة
    const sale = await db.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          sellerId,
          shiftId,
          subtotal: new Prisma.Decimal(subtotal),
          vatAmount: new Prisma.Decimal(vatAmount),
          feeAmount: new Prisma.Decimal(feeAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          paymentMethod,
          items: { create: saleItems },
        },
        include: { items: true },
      });

      await Promise.all(items.map(i =>
        tx.product.update({ where: { id: i.productId }, data: { stock: { decrement: i.quantity } } })
      ));

      return newSale;
    });

    return NextResponse.json({ message: 'Sale created successfully', sale }, { status: 201 });

  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ error: 'Internal Server Error while creating sale.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const auth = await authenticateToken(request as any, 'any');
  if (auth instanceof NextResponse) return auth;

  try {
    const sales = await db.sale.findMany({
      include: { seller: { select: { name: true } }, items: true },
      orderBy: { saleTime: 'desc' },
    });

    return NextResponse.json(sales, { status: 200 });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Internal Server Error while fetching sales.' }, { status: 500 });
  }
}