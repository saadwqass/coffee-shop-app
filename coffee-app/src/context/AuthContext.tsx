'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
// نحتاج لـ Next.js Router لإعادة توجيه المستخدمين
import { useRouter } from 'next/navigation';

// 1. تحديد الأنواع (يتوافق مع ما تم تخزينه في Local Storage)
interface AuthUser {
  token: string;
  role: 'admin' | 'seller';
  userId: string | null; // سنفترض أننا قد نحتاجه لاحقاً
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSeller: boolean;
}

// 2. الثوابت (المتوافقة مع ما تم استخدامه في صفحة login)
const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'user_role';
const USER_ID_KEY = 'user_id'; // سنفترض هذا المفتاح للاستكمال

// 🏆 دالة مساعدة لجلب التوكن (مُصدّرة لاستخدامها في src/lib/api.ts)
export const getAuthToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(TOKEN_KEY);
    }
    return null;
};

// 3. إنشاء السياق
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 4. مزود السياق
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // تحميل حالة المستخدم من الذاكرة المحلية عند بدء التشغيل
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY) as 'admin' | 'seller' | null;
    const userId = localStorage.getItem(USER_ID_KEY); // قد يكون غير موجود حالياً

    if (token && role) {
      setUser({ token, role, userId: userId || null });
    }
    setIsLoading(false);
  }, []);

  // وظيفة تسجيل الخروج
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_ID_KEY);
    setUser(null);
    // 🏆 إعادة التوجيه لصفحة تسجيل الدخول
    router.push('/login');
  };
  
  // وظيفة تحديث حالة المستخدم بعد تسجيل الدخول الناجح في صفحة login/register
  const setAuthUser = (token: string, role: 'admin' | 'seller', userId?: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
    if (userId) localStorage.setItem(USER_ID_KEY, userId);
    setUser({ token, role, userId: userId || null });
  };
  // 💡 ملاحظة: يجب تعديل صفحة login/page.tsx لاحقاً لاستخدام setAuthUser بدل التخزين المباشر

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isSeller = user?.role === 'seller';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        logout,
        isAuthenticated,
        isAdmin,
        isSeller,
        // يمكن إضافة setAuthUser هنا إذا أردنا تحديث حالة المستخدم مركزياً
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 5. الخطاف المخصص
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};