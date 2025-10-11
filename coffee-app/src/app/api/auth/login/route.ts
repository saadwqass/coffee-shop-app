export const runtime = 'node';

import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { generateAuthToken, generateRefreshToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, role: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // إنشاء التوكنات
    const accessToken = generateAuthToken(user);
    const refreshToken = generateRefreshToken(user.id);

   

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token: accessToken,
      },
      { status: 200 }
    );

    // تعيين الكوكيز
    response.cookies.set('auth_token', accessToken, {
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
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}