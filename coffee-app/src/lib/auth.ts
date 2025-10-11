import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';

// نوع الحمولة داخل JWT
export interface CustomJwtPayload extends JwtPayload {
  userId: string;
  email: string;
  role: 'admin' | 'seller';
}

/**
 * توليد توكن مصادقة JWT
 * @param user بيانات المستخدم
 * @returns التوكن (JWT)
 */
export function generateAuthToken(user: { id: string; email: string; role: 'admin' | 'seller' }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn: '1h' } // توكن صالح لمدة ساعة واحدة
  );
}

/**
 * توليد توكن تجديد (Refresh Token)
 */
export function generateRefreshToken(userId: string) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');

  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
}

/**
 * التحقق من صلاحية توكن JWT من الهيدر أو الكوكيز
 */
export async function authenticateToken(
  request: NextRequest,
  requiredRole: 'admin' | 'seller' | 'any' | ('admin' | 'seller')[] = 'any'
): Promise<CustomJwtPayload | NextResponse> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is missing');

    // أولوية للهيدر ثم الكوكيز
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('auth_token')?.value;
    const token = authHeader?.split(' ')[1] || cookieToken;

    if (!token) {
      return NextResponse.json({ error: 'Token missing.' }, { status: 401 });
    }

    const decoded = jwt.verify(token, secret) as CustomJwtPayload;

    if (!decoded?.userId || !decoded?.role) {
      return NextResponse.json({ error: 'Invalid token payload.' }, { status: 401 });
    }

    // تحقق من الدور
    if (requiredRole !== 'any') {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(decoded.role)) {
        return NextResponse.json({ error: 'Forbidden: insufficient permissions.' }, { status: 403 });
      }
    }

    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Token expired.' }, { status: 401 });
    }
    console.error('JWT verification failed:', error.message);
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }
}