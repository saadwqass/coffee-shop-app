export const runtime = 'node';

import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { generateAuthToken, generateRefreshToken } from '@/lib/auth';

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: 'Email is required and password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'User already exists.' }, { status: 409 });
    }

    const userCount = await db.user.count();
    const role = userCount === 0 ? 'admin' : 'seller';

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        passwordHash: hashed,
        role,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    // إنشاء التوكن مباشرة بعد التسجيل
    const token = generateAuthToken(user);
    const refreshToken = generateRefreshToken(user.id);

 

    const response = NextResponse.json(
      { message: `Account created successfully as ${role}`, user, token },
      { status: 201 }
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60, // ساعة واحدة
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 أيام
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}