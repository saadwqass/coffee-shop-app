'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { UserPlus, Lock, Mail, Users } from 'lucide-react'; 

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // 🔑 التعديل الأول: إضافة حالة لاختيار الدور، القيمة الافتراضية 'seller'
  const [role, setRole] = useState<'seller' | 'admin'>('seller'); 
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // دالة بديلة للتوجيه تحل محل useRouter.push
  const navigateTo = (path: string) => {
      window.location.href = path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // تحقق بسيط في الواجهة (Client-side validation)
    if (password.length < 6) {
        setError('يجب أن تكون كلمة المرور 6 أحرف على الأقل.');
        return;
    }

    try {
      const response = await axios.post('/api/auth/register', {
        email,
        password,
        // 🔑 التعديل الرئيسي: إرسال الدور المختار
        role: role, 
      });

      if (response.status === 201) {
        setMessage('✅ تم التسجيل بنجاح! سيتم توجيهك الآن لصفحة تسجيل الدخول.');
        setTimeout(() => {
          navigateTo('/login'); 
        }, 2000); // توجيه بعد ثانيتين
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'فشل التسجيل. ربما البريد الإلكتروني مستخدم بالفعل.';
      setError(errorMessage);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-stone-100 to-amber-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-amber-100/50 transform hover:shadow-3xl transition duration-500">
        
        {/* رأس البطاقة */}
        <div className="flex flex-col items-center mb-8">
            <UserPlus className="w-12 h-12 text-amber-600 mb-3" />
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                إنشاء حساب داخلي
            </h2>
            <p className="mt-2 text-sm text-gray-500">
                للبائعين والمشرفين فقط
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

          {/* حقل البريد الإلكتروني (بدون تغيير) */}
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

          {/* حقل كلمة المرور (بدون تغيير) */}
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
                  minLength={6} 
                  className="mt-1 block w-full pr-10 pl-4 py-2 border border-gray-300 rounded-xl shadow-inner focus:ring-amber-500 focus:border-amber-500 text-right transition duration-150"
                  placeholder="كلمة المرور (6 أحرف على الأقل)"
                />
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
          
          {/* 🔑 حقل اختيار الدور (Role Selection) */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 text-right mb-1">
              اختيار الدور
            </label>
            <div className="relative">
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'seller' | 'admin')}
                  required
                  className="appearance-none mt-1 block w-full pr-10 pl-4 py-2 border border-gray-300 rounded-xl shadow-inner focus:ring-amber-500 focus:border-amber-500 text-right transition duration-150 bg-white"
                >
                  <option value="seller">بائع (POS)</option>
                  <option value="admin">مسؤول (Admin)</option>
                </select>
                <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* زر التسجيل (بدون تغيير) */}
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-amber-500/50 transition duration-300 ease-in-out transform hover:scale-[1.01]"
          >
            إنشاء حساب
          </button>
        </form>

        {/* رابط تسجيل الدخول (بدون تغيير) */}
        <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
                لديك حساب بالفعل؟ 
                <a href="/login" className="font-medium text-amber-600 hover:text-amber-500 ml-1 transition duration-150">
                    سجل الدخول
                </a>
            </p>
        </div>
      </div>
    </div>
  );
}