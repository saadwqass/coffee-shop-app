'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'seller')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isAdmin, isSeller, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // لا تفعل شيئاً أثناء التحميل

    if (!isAuthenticated) {
      // 🏆 غير مصادق: وجه لصفحة تسجيل الدخول
      router.replace('/login');
      return;
    }

    const userRole = isAdmin ? 'admin' : isSeller ? 'seller' : null;

    if (userRole && !allowedRoles.includes(userRole)) {
      // 🏆 دور غير مصرح به: وجه لصفحة خطأ أو لوحة البائع
      if (isAdmin) {
         router.replace('/admin/dashboard');
      } else {
         router.replace('/pos'); // أو صفحة خطأ 403
      }
    }
  }, [isAuthenticated, isAdmin, isSeller, isLoading, allowedRoles, router]);

  // إذا كان يتم التحميل أو غير مصادق، أظهر حالة تحميل
  if (isLoading || !isAuthenticated || (isAuthenticated && !allowedRoles.includes(isAdmin ? 'admin' : 'seller'))) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-700">
            <p>Loading or Redirecting...</p>
        </div>
    );
  }

  // مسموح له بالوصول
  return <>{children}</>;
};

export default ProtectedRoute;