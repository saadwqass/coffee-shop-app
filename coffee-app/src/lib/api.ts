import { getAuthToken } from '@/context/AuthContext'; 
import axios from 'axios';

// دالة مساعدة لإعادة التوجيه لتسجيل الدخول
const redirectToLogin = () => {
  if (typeof window !== 'undefined') {
    // مسح جميع بيانات المصادقة المحلية
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
    
    // إعادة التوجيه إلى صفحة تسجيل الدخول مع رسالة
    window.location.href = '/login?message=session_expired';
  }
};

// دالة مساعدة لمسح بيانات المصادقة
const clearAuthData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
  }
};

export async function fetchData(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data: any = null
): Promise<any> {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }), 
  };

  try {
    const response = await axios({
      url: endpoint,
      method,
      headers,
      data: (method !== 'GET' && method !== 'DELETE') ? data : undefined,
      params: (method === 'GET') ? data : undefined,
      timeout: 15000, // زيادة المهلة إلى 15 ثانية
    });

    return response.data;
  } catch (err: any) {
    const status = err.response?.status;
    const errorMessage = err.response?.data?.error || 'Internal API error.';
    
    console.error(`API Error [${status} for ${endpoint}]:`, errorMessage);

    // معالجة أخطاء المصادقة بشكل صحيح
    if (status === 401 || status === 403) {
      console.error('Authentication error detected, clearing auth data and redirecting...');
      
      // مسح بيانات المصادقة أولاً
      clearAuthData();
      
      // إعادة التوجيه إلى تسجيل الدخول فقط إذا كنا في متصفح
      if (typeof window !== 'undefined') {
        // تجنب إعادة التوجيه المتعددة
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
          setTimeout(() => {
            redirectToLogin();
          }, 100);
        }
      }
      
      throw new Error('انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.');
    }

    // معالجة أخطاء أخرى
    if (status === 400) {
      throw new Error(errorMessage || 'بيانات غير صحيحة.');
    } else if (status === 404) {
      throw new Error('الخدمة غير متوفرة.');
    } else if (status === 500) {
      throw new Error('خطأ في الخادم. يرجى المحاولة مرة أخرى.');
    } else if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNABORTED') {
      throw new Error('فشل الاتصال بالخادم. يرجى التحقق من اتصال الشبكة.');
    } else {
      throw new Error(errorMessage);
    }
  }
}

// دالة مساعدة للتحقق من صحة التوكن
export const validateToken = async (): Promise<boolean> => {
  try {
    const token = getAuthToken();
    if (!token) return false;

    // يمكن إضافة طلب للتحقق من صحة التوكن إذا كان هناك endpoint مناسب
    // await fetchData('/api/auth/verify');
    return true;
  } catch (error) {
    return false;
  }
};