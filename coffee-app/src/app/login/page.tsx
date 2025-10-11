'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { Coffee, Lock, Mail } from 'lucide-react'; // استخدام أيقونات Lucide
// تم إزالة استيراد next/navigation و next/link لحل مشكلة التجميع

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // دالة مساعدة للتوجيه باستخدام متصفح قياسي (بديل لـ useRouter)
  const navigateTo = (path: string) => {
      window.location.href = path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      });

      // التحقق من الاستجابة وحقل التوكن
      if (response.status === 200 && response.data.token) {
        
        // 1. تخزين التوكن والدور في localStorage (لأغراض التطوير الداخلي)
        // 🚨 ملاحظة: في بيئة الإنتاج، يفضل بشدة استخدام HTTP-Only Cookies للأمان.
        localStorage.setItem('auth_token', response.data.token); 
        localStorage.setItem('user_role', response.data.role);

        // 2. تحديث الرسالة
        setMessage(`تم تسجيل الدخول بنجاح! مرحباً بك.`);
        
        // 3. تحديد مسار التوجيه بناءً على الدور
        const userRole = response.data.role;
        let targetPath = '/pos';

        if (userRole === 'admin') { 
          targetPath = '/admin/dashboard';
        } else if (userRole === 'seller') {
          targetPath = '/pos';
        } 
        // الأدوار الأخرى غير المحددة ستذهب أيضًا إلى /pos افتراضيًا

        // 4. التوجيه بعد تأخير بسيط لرؤية رسالة النجاح
        setTimeout(() => {
          navigateTo(targetPath);
        }, 500);

      } else {
         // في حالة أن Status 200 ولكن لا يوجد توكن (نادر)
         setError('فشل غير متوقع في تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      // 5. معالجة رسائل الخطأ
      const status = err.response?.status;
      let errorMessage = 'فشل الاتصال بالخادم. يرجى التحقق من الشبكة.';

      if (status === 401) {
          errorMessage = err.response?.data?.error || 'بيانات اعتماد غير صحيحة (بريد إلكتروني أو كلمة مرور).';
      } else if (status) {
          errorMessage = `خطأ في الخادم (${status}): ${err.response?.data?.error || 'حدث خطأ غير معروف.'}`;
      }
      
      setError(errorMessage);
    }
  };

  return (
    // خلفية ذات تدرج لوني دافئ
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-stone-100 to-amber-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-amber-100/50 transform hover:shadow-3xl transition duration-500">
        
        {/* رأس البطاقة */}
        <div className="flex flex-col items-center mb-8">
            <Coffee className="w-12 h-12 text-amber-600 mb-3 animate-pulse" />
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                أهلاً بك مجدداً
            </h2>
            <p className="mt-2 text-sm text-gray-500">
                تسجيل الدخول لنظام نقطة البيع والإدارة
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* رسائل الحالة */}
          {message && (
            <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm text-right border border-green-200">
              {message}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm text-right border border-red-200">
              {error}
            </div>
          )}

          {/* حقل البريد الإلكتروني */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-right mb-1">
              البريد الإلكتروني
            </label>
            <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full pr-10 pl-4 py-2 border border-gray-300 rounded-xl shadow-inner focus:ring-amber-500 focus:border-amber-500 text-right transition duration-150"
                  placeholder="ادخل بريدك الإلكتروني"
                />
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* حقل كلمة المرور */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 text-right mb-1">
              كلمة المرور
            </label>
            <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full pr-10 pl-4 py-2 border border-gray-300 rounded-xl shadow-inner focus:ring-amber-500 focus:border-amber-500 text-right transition duration-150"
                  placeholder="********"
                />
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* زر تسجيل الدخول */}
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-amber-500/50 transition duration-300 ease-in-out transform hover:scale-[1.01]"
          >
            تسجيل الدخول
          </button>
        </form>

        {/* رابط التسجيل */}
        <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
                ليس لديك حساب؟ 
                <a href="/register" className="font-medium text-amber-600 hover:text-amber-500 ml-1 transition duration-150">
                    سجل الآن
                </a>
            </p>
        </div>
      </div>
    </div>
  );
}
