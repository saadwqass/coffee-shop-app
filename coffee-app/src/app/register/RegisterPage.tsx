'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { UserPlus, Lock, Mail, Users, Eye, EyeOff } from 'lucide-react';
import './RegisterPage.css';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'seller' | 'admin'>('seller');
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

    if (password.length < 6) {
      setError('يجب أن تكون كلمة المرور 6 أحرف على الأقل.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/auth/register', {
        email,
        password,
        name,
        role,
      });

      if (response.status === 201) {
        setMessage('✅ تم التسجيل بنجاح! سيتم توجيهك الآن لصفحة تسجيل الدخول.');
        setTimeout(() => {
          navigateTo('/login');
        }, 2000);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'فشل التسجيل. ربما البريد الإلكتروني مستخدم بالفعل.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        
        {/* رأس البطاقة */}
        <div className="header-section">
          <div className="logo-container">
            <UserPlus className="register-icon" />
            <div className="logo-text">
              <span className="logo-main">إنشاء حساب</span>
              <span className="logo-sub">نظام المقهى</span>
            </div>
          </div>
          <h2 className="title">
            حساب جديد
          </h2>
          <p className="subtitle">
            للبائعين والمشرفين فقط
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-layout">
          {/* رسائل الحالة */}
          {message && (
            <div className="success-message">
              <i className="fas fa-check-circle"></i>
              {message}
            </div>
          )}
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {/* حقل الاسم */}
          <div className="input-container">
            <label htmlFor="name" className="input-label">
              الاسم (اختياري)
            </label>
            <div className="input-group">
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="ادخل اسمك"
                disabled={isLoading}
              />
              <Users className="input-icon" />
            </div>
          </div>

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
                minLength={6}
                className="input-field"
                placeholder="كلمة المرور (6 أحرف على الأقل)"
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

          {/* حقل اختيار الدور */}
          <div className="input-container">
            <label htmlFor="role" className="input-label">
              اختيار الدور
            </label>
            <div className="input-group">
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'seller' | 'admin')}
                required
                className="input-field select-field"
                disabled={isLoading}
              >
                <option value="seller">بائع (POS)</option>
                <option value="admin">مسؤول (Admin)</option>
              </select>
              <Users className="input-icon" />
            </div>
          </div>

          {/* زر التسجيل */}
          <button
            type="submit"
            className={`submit-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                جاري إنشاء الحساب...
              </>
            ) : (
              'إنشاء حساب'
            )}
          </button>
        </form>

        {/* رابط تسجيل الدخول */}
        <div className="login-link-container">
          <p className="login-text">
            لديك حساب بالفعل؟ 
            <a href="/login" className="login-link">
              سجل الدخول
            </a>
          </p>
        </div>

        {/* معلومات إضافية */}
        <div className="info-section">
          <div className="info-item">
            <i className="fas fa-shield-alt"></i>
            <span>بياناتك محمية وآمنة</span>
          </div>
          <div className="info-item">
            <i className="fas fa-bolt"></i>
            <span>إنشاء فوري للحساب</span>
          </div>
        </div>
      </div>
    </div>
  );
}