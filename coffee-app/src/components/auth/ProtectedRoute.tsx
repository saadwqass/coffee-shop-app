'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'seller')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isAdmin, isSeller, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // إذا كان يتم التحميل، لا تفعل شيئاً
    if (isLoading) {
      setIsChecking(true);
      return;
    }

    setIsChecking(false);

    // إذا تمت إعادة التوجيه مسبقاً، لا تكرر
    if (hasRedirected) {
      return;
    }

    // إذا لم يكن المستخدم مصادقاً
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      setHasRedirected(true);
      router.replace('/login');
      return;
    }

    // تحديد دور المستخدم
    const userRole = isAdmin ? 'admin' : isSeller ? 'seller' : null;
    
    // إذا لم يكن للمستخدم دور صالح
    if (!userRole) {
      console.log('No valid role found, redirecting to login');
      setHasRedirected(true);
      router.replace('/login');
      return;
    }

    // إذا لم يكن الدور مسموحاً به
    if (!allowedRoles.includes(userRole)) {
      console.log(`Role ${userRole} not allowed for path ${pathname}`);
      setHasRedirected(true);
      
      // التوجيه إلى الصفحة المناسبة حسب الدور
      const targetPath = isAdmin ? '/admin/dashboard' : '/pos';
      
      // منع التكرار بالتحقق من المسار الحالي
      if (pathname !== targetPath) {
        router.replace(targetPath);
      }
    } else {
      // السماح بالوصول، إعادة تعيين حالة إعادة التوجيه
      setHasRedirected(false);
    }
  }, [isAuthenticated, isAdmin, isSeller, isLoading, allowedRoles, router, pathname, hasRedirected]);

  // عرض حالة التحميل
  if (isChecking || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-700">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // التحقق النهائي قبل العرض
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>جاري إعادة التوجيه لتسجيل الدخول...</p>
        </div>
      </div>
    );
  }

  const userRole = isAdmin ? 'admin' : isSeller ? 'seller' : null;
  if (!userRole || !allowedRoles.includes(userRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>جاري إعادة التوجيه للصفحة المناسبة...</p>
        </div>
      </div>
    );
  }

  // مسموح له بالوصول
  return <>{children}</>;
};

export default ProtectedRoute;