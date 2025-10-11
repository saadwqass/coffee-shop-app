import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authenticateToken } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/register', '/'];

// دالة لمطابقة المسار مع المسارات العامة
function isPublicPath(pathname: string) {
    return PUBLIC_PATHS.includes(pathname);
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // السماح بالمسارات العامة مباشرة
    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    // تحديد الدور المطلوب حسب المسار
    let requiredRole: 'admin' | 'seller' | 'any' = 'any';
    if (pathname.startsWith('/admin')) requiredRole = 'admin';
    else if (pathname.startsWith('/pos')) requiredRole = 'seller';

    // التحقق من JWT
    const authResult = await authenticateToken(request, requiredRole);
    if (authResult instanceof NextResponse) {
        // توكن غير موجود أو غير صالح أو الدور غير مناسب
        return authResult;
    }

    // التوكن صالح والدور مناسب
    return NextResponse.next();
}

// تحديد المسارات التي سيطبق عليها middleware
export const config = {
    matcher: [
        '/api/:path*',
        '/pos/:path*',
        '/admin/:path*',
    ],
};