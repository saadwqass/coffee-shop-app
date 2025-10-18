'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { Coffee, Lock, Mail, Eye, EyeOff, CheckCircle, AlertCircle, Shield, Clock } from 'lucide-react'; 
import './login-styles.css';

interface LoginResponse {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
}

interface LoginError {
  response?: {
    status: number;
    data: {
      error: string;
    };
  };
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    // التحقق الأساسي من المدخلات
    if (!email.trim() || !password.trim()) {
      setError('البريد الإلكتروني وكلمة المرور مطلوبان');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post<LoginResponse>('/api/auth/login', {
        email: email.toLowerCase().trim(),
        password,
      });

      if (response.status === 200 && response.data.token) {
        // حفظ البيانات في localStorage
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user_role', response.data.user.role);
        localStorage.setItem('user_name', response.data.user.name);

        setMessage(`تم تسجيل الدخول بنجاح! مرحباً ${response.data.user.name}`);

        // التوجيه بناءً على دور المستخدم
        const userRole = response.data.user.role;
        let targetPath = '/pos';

        if (userRole === 'admin') {
          targetPath = '/admin/dashboard';
        } else if (userRole === 'seller') {
          targetPath = '/pos';
        }

        // التوجيه بعد تأخير بسيط
        setTimeout(() => {
          navigateTo(targetPath);
        }, 1500);

      } else {
        setError('فشل غير متوقع في تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
    } catch (err: unknown) {
      const error = err as LoginError;
      const status = error.response?.status;
      let errorMessage = 'فشل الاتصال بالخادم. يرجى التحقق من الشبكة.';

      if (status === 401) {
        errorMessage = error.response?.data?.error || 'بيانات اعتماد غير صحيحة (بريد إلكتروني أو كلمة مرور).';
      } else if (status === 400) {
        errorMessage = 'بيانات غير صحيحة. يرجى التحقق من المدخلات.';
      } else if (status) {
        errorMessage = `خطأ في الخادم (${status}): ${error.response?.data?.error || 'حدث خطأ غير معروف.'}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* رأس البطاقة */}
        <div className="header-section">
          <div className="logo-container">
            <Coffee className="coffee-icon" />
            <div className="logo-text">
              <span className="logo-main">Coffee</span>
              <span className="logo-sub">Shop</span>
            </div>
          </div>
          <h2 className="title">
            أهلاً بك مجدداً
          </h2>
          <p className="subtitle">
            تسجيل الدخول لنظام نقطة البيع والإدارة
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-layout">
          {/* رسائل الحالة */}
          {message && (
            <div className="success-message">
                {/* 🏆 تم استبدال Font Awesome بـ Lucide */}
              <CheckCircle size={18} />
              {message}
            </div>
          )}
          {error && (
            <div className="error-message">
                {/* 🏆 تم استبدال Font Awesome بـ Lucide */}
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* حقل البريد الإلكتروني */}
          <div className="input-container">
            <label htmlFor="email" className="input-label">
              البريد الإلكتروني
            </label>
            <div className="input-group">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="ادخل بريدك الإلكتروني"
                disabled={isLoading}
              />
              <Mail className="input-icon" />
            </div>
          </div>

          {/* حقل كلمة المرور */}
          <div className="input-container">
            <label htmlFor="password" className="input-label">
              كلمة المرور
            </label>
            <div className="input-group">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                placeholder="********"
                disabled={isLoading}
              />
              <Lock className="input-icon" />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* زر تسجيل الدخول */}
          <button
            type="submit"
            className={`submit-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                جاري تسجيل الدخول...
              </>
            ) : (
              'تسجيل الدخول'
            )}
          </button>

          {/* رابط نسيت كلمة المرور */}
          <div className="forgot-password-container">
            <a href="/forgot-password" className="forgot-password-link">
              نسيت كلمة المرور؟
            </a>
          </div>
        </form>

        {/* رابط التسجيل */}
        <div className="register-link-container">
          <p className="register-text">
            ليس لديك حساب؟ 
            <a href="/register" className="register-link">
              سجل الآن
            </a>
          </p>
        </div>

        {/* معلومات إضافية */}
        <div className="info-section">
          <div className="info-item">
                {/* 🏆 تم استبدال Font Awesome بـ Lucide */}
            <Shield size={14} /> 
            <span>بياناتك محمية وآمنة</span>
          </div>
          <div className="info-item">
                {/* 🏆 تم استبدال Font Awesome بـ Lucide */}
            <Clock size={14} />
            <span>متاح 24/7</span>
          </div>
        </div>
      </div>
    </div>
  );
}