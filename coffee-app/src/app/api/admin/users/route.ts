export const runtime = 'node';

import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * POST: إنشاء بائع (Seller) جديد
 * المسار: /api/admin/users
 * الحماية: يتطلب دور 'admin'
 */
export async function POST(request: Request) {
    const authResult = await authenticateToken(request as any, 'admin'); 
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    try {
        const { email, password, name } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }
        
         const existingUser = await db.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // 🛑 التعديل هنا: استخدام passwordHash بدلاً من password
        const user = await db.user.create({
            data: {
                email: email.toLowerCase().trim(),
                name: name ? name.trim() : null,
                passwordHash: hashedPassword, // 🏆 تم التصحيح ليتوافق مع schema.prisma
                role: 'seller', 
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            }
        });

        return NextResponse.json({
            message: 'Seller account created successfully',
            user
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Internal Server Error while creating user.' }, { status: 500 });
    }
}

/**
 * GET: جلب جميع المستخدمين (لواجهة الإدارة)
 * المسار: /api/admin/users
 * الحماية: يتطلب دور 'admin'
 */
export async function GET(request: Request) {
    const authResult = await authenticateToken(request as any, 'admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    try {
        const users = await db.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(users, { status: 200 });

    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Internal Server Error while fetching users.' }, { status: 500 });
    }
}