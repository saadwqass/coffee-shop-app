import { getAuthToken } from '@/context/AuthContext'; 
// سنفترض وجود axios للاستمرار في استخدام المكتبة التي اعتمدتها في صفحات المصادقة
import axios from 'axios';

/**
 * دالة مساعدة لطلب الـ API مع تضمين التوكن
 * @param endpoint المسار النسبي (مثل /api/admin/categories)
 * @param options خيارات الطلب (مثل method, data)
 */
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
      params: (method === 'GET') ? data : undefined, // تمرير الباراميترات لطلبات GET
    });

    return response.data;
  } catch (err: any) {
    const status = err.response?.status;
    const errorMessage = err.response?.data?.error || 'Internal API error.';
    
    // 401/403: توكن غير صالح.
    if (status === 401 || status === 403) {
        // يمكنك هنا إضافة منطق إعادة توجيه المستخدم لصفحة تسجيل الدخول إذا لزم الأمر
        console.error("Authentication Error. You might need to log out the user.");
    }

    throw new Error(errorMessage);
  }
}