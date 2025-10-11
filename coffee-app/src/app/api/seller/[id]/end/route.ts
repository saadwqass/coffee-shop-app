export const runtime = 'node';

import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

interface Context {
    params: {
        id: string;
    };
}

export async function POST(request: Request, context: Context) {
    const authResult = await authenticateToken(request as any);
    if (authResult instanceof NextResponse) return authResult;

    const authenticatedData: any = authResult;
    const sellerId = authenticatedData.userId || authenticatedData.user?.id || authenticatedData.id;

    if (!sellerId) {
        return NextResponse.json({ error: 'Authentication payload is missing user ID.' }, { status: 401 });
    }

    const shiftId = context.params.id;

    try {
        const { endingCash } = await request.json();

        if (endingCash === undefined || typeof endingCash !== 'number' || endingCash < 0) {
            return NextResponse.json({ error: 'Ending cash is required and must be a non-negative number.' }, { status: 400 });
        }

        // التأكد من وجود وردية نشطة للبائع
        const activeShift = await db.shift.findFirst({
            where: { id: shiftId, sellerId, endTime: null },
        });

        if (!activeShift) {
            return NextResponse.json({ error: 'Active shift not found or you are not authorized to end this shift.' }, { status: 404 });
        }

        // تحديث الوردية
        const updatedShift = await db.shift.update({
            where: { id: shiftId },
            data: {
                endTime: new Date(),
                endingCash: new Prisma.Decimal(endingCash),
            },
        });

        return NextResponse.json({
            message: 'Shift ended successfully',
            shift: updatedShift
        }, { status: 200 });

    } catch (error) {
        console.error('Error ending shift:', error);
        return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
    }
}