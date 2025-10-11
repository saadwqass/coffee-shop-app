export const runtime = 'node';



import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { Prisma, ShiftType } from '@prisma/client'; // ✅ استخدام Prisma.Decimal

/**
 * ✅ إنشاء وردية جديدة للبائع
 */
export async function POST(request: Request) {
  const auth = await authenticateToken(request as any, 'seller');
  if (auth instanceof NextResponse) return auth;

  try {
    const { shiftType, startingCash } = await request.json() as {
      shiftType?: string;
      startingCash?: number;
    };

    // التحقق من البيانات الأساسية
    if (!shiftType) {
      return NextResponse.json({ error: 'Shift type is required.' }, { status: 400 });
    }

    // ✅ التحقق من أن shiftType قيمة صحيحة من Enum
    if (!Object.values(ShiftType).includes(shiftType as ShiftType)) {
      return NextResponse.json(
        { error: `Invalid shift type. Must be one of: ${Object.values(ShiftType).join(', ')}` },
        { status: 400 }
      );
    }

    if (startingCash != null && (isNaN(startingCash) || startingCash < 0)) {
      return NextResponse.json({ error: 'Starting cash must be a non-negative number.' }, { status: 400 });
    }

    // ✅ منع وجود وردية نشطة مسبقًا
    const activeShift = await db.shift.findFirst({
      where: { sellerId: auth.user.userId, endTime: null },
    });

    if (activeShift) {
      return NextResponse.json(
        { error: 'You already have an active shift. Please close it first.', activeShiftId: activeShift.id },
        { status: 409 }
      );
    }

    // ✅ استخدام Prisma.Decimal بدلًا من Decimal
    const newShift = await db.shift.create({
      data: {
        sellerId: auth.user.userId,
        shiftType: shiftType as ShiftType,
        startingCash: new Prisma.Decimal(startingCash || 0),
      },
    });

    return NextResponse.json(
      {
        message: 'Shift started successfully.',
        shift: {
          id: newShift.id,
          startTime: newShift.startTime,
          shiftType: newShift.shiftType,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}