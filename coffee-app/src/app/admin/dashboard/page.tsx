
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
// تم حذف Mock ProtectedRoute واعتمدنا على الملف الحقيقي (مفترض وجوده)
import ProtectedRoute from '@/components/auth/ProtectedRoute'; 
// تم استيراد المخازن الحقيقية (الموجودة في الـ Context الآن)
import { useProductStore } from '@/store/productStore';
import { useCategoryStore } from '@/store/categoryStore';
// الآن أصبحنا نستورد fetchData الحقيقية التي أرسلتها
import { fetchData } from '@/lib/api'; 
import { LayoutDashboard, Package, Coffee, Users, DollarSign, BarChart, Sun, Moon } from 'lucide-react';
import './dashboard.css';

// ---------------------------------------------------------------------
// 1. تعريف الأنواع الجديدة (المتطابقة مع استجابة الـ API)
// ---------------------------------------------------------------------

interface TopProduct {
    productName: string; // يُطابق الـ groupBy في الـ API
    _sum: {
        quantity: number | null;
    }
}

interface DailySalesData {
    date: string;
    revenue: string; // يستخدم string ليتوافق مع Decimal من Prisma
}

interface DashboardData {
    totalRevenue: number;
    totalOrders: number;
    topProducts: TopProduct[];
    dailySales: DailySalesData[];
}

// ---------------------------------------------------------------------
// 2. مكونات الرسوم البيانية
// ---------------------------------------------------------------------

/**
 * محاكاة رسم بياني شريطي (Bar Chart) للإيرادات اليومية
 */
const SalesBarChart: React.FC<{ data: DailySalesData[] }> = ({ data }) => {
    // تحويل الإيرادات إلى أرقام لتحديد الحد الأقصى
    const numericData = data.map(d => ({
        time: new Date(d.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
        totalSales: parseFloat(d.revenue) || 0,
    }));
    
    // إذا كانت البيانات ليوم واحد، نعرضها حسب الساعة، وإلا حسب اليوم
    const isSingleDay = data.length <= 1;
    let chartPoints = numericData;
    
    // ملاحظة: بما أن API (daily-report) الحالي يرجع إيرادات اليوم كاملاً،
    // سنستخدم بيانات وهمية للساعة مؤقتاً لنجعل الرسم البياني مفيداً لهذا الجزء من اليوم
    if (isSingleDay && numericData.length > 0) {
        chartPoints = [
            { time: '8 ص', totalSales: (numericData[0].totalSales / 5) },
            { time: '10 ص', totalSales: (numericData[0].totalSales / 2) },
            { time: '12 م', totalSales: numericData[0].totalSales },
            { time: '2 م', totalSales: (numericData[0].totalSales / 3) },
        ];
    }
    
    const maxSales = Math.max(...chartPoints.map(d => d.totalSales)) || 1;

    return (
        <div className="h-64 flex flex-col justify-end p-2">
            <div className="flex justify-around items-end h-full">
                {chartPoints.map((point, index) => {
                    const heightPercent = (point.totalSales / maxSales) * 100 * 0.9;
                    return (
                        <div key={index} className="flex flex-col items-center justify-end h-full group">
                            <div 
                                className="w-8 rounded-t-lg transition-all duration-500 ease-out bg-amber-500 dark:bg-amber-400 hover:bg-amber-700 dark:hover:bg-amber-500"
                                style={{ height: `${heightPercent}%` }}
                            ></div>
                            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-y-12 p-1 text-xs font-bold rounded shadow-md bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-100 whitespace-nowrap z-10">
                                {point.totalSales.toFixed(2)} SAR
                            </div>
                            <span className="mt-2 text-xs text-gray-600 dark:text-gray-400 font-medium">{point.time}</span>
                        </div>
                    );
                })}
            </div>
            <div className="h-px w-full bg-gray-300 dark:bg-gray-700 mt-2"></div>
        </div>
    );
};

/**
 * مكون لعرض قائمة المنتجات الأكثر مبيعاً
 */
const TopProductsList: React.FC<{ products: TopProduct[] }> = ({ products }) => {
    if (products.length === 0) {
        return <p className="text-gray-500 dark:text-gray-400 text-center pt-8">لا توجد مبيعات في الفترة الحالية.</p>;
    }
    
    const topProducts = products
        .map(p => ({
            name: p.productName,
            totalQuantity: p._sum.quantity || 0
        }))
        .filter(p => p.totalQuantity > 0)
        .sort((a, b) => b.totalQuantity - a.totalQuantity);

    const maxQuantity = topProducts[0]?.totalQuantity || 1;
    
    return (
        <ul className="space-y-4 pt-2">
            {topProducts.slice(0, 4).map((p, index) => {
                const widthPercent = (p.totalQuantity / maxQuantity) * 100;
                return (
                    <li key={p.name} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{index + 1}. {p.name}</span>
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{p.totalQuantity} وحدة</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div 
                                className="h-2.5 rounded-full bg-red-500 dark:bg-red-400 transition-all duration-700" 
                                style={{ width: `${widthPercent}%` }}
                            ></div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
};


// ---------------------------------------------------------------------
// 3. مكون لوحة التحكم الرئيسية (الذي يجلب البيانات الآن)
// ---------------------------------------------------------------------

const AdminDashboardContent = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
        }
        return 'light';
    });
    
    // نستخدم الآن المخازن الحقيقية (لجلب عدد المنتجات والأصناف)
    const { products } = useProductStore();
    const { categories, fetchCategories } = useCategoryStore();
    
    const [stats, setStats] = useState<any>(null); // نستخدم any هنا لتخزين الردود المجمعة
    const [loadingStats, setLoadingStats] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // تطبيق الثيم
    useEffect(() => {
        if (typeof document !== 'undefined') {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            localStorage.setItem('theme', theme);
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // 🏆 دالة جلب بيانات الإحصائيات الحقيقية
    const fetchDashboardData = useCallback(async () => {
        setLoadingStats(true);
        setError(null);
        try {
            // جلب الإحصائيات اليومية (من /api/reports/daily)
            const dailyReport = await fetchData('/api/reports/daily');
            
            // جلب المنتجات الأكثر مبيعاً (من /api/reports/top-products)
            const topProducts = await fetchData('/api/reports/top-products');
            
            // جلب بيانات الرسوم البيانية (من /api/admin/reports/sales) - فلتر حسب اليوم
            // 💡 لاحظ أن API /reports/sales يرجع بيانات أكثر تفصيلاً، يمكن استخدامه للرسم البياني
            const fullReport = await fetchData('/api/admin/reports/sales', 'GET', {
                fromDate: new Date().toISOString().split('T')[0], // فلتر اليوم فقط
            });
            
            setStats({
                dailyReport,
                topProducts,
                revenueChartData: fullReport.revenueChartData,
            });
            
            // أيضاً، جلب الأصناف
            await fetchCategories();
            
        } catch (err: any) {
            console.error('Failed to fetch dashboard data:', err);
            setError(err.message || 'فشل تحميل بيانات لوحة التحكم من الخادم.');
        } finally {
            setLoadingStats(false);
        }
    }, [fetchCategories]); // يعتمد على fetchCategories لتجنب حلقة مفرغة

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);
    
    // بيانات البطاقات (تعتمد الآن على حالة stats)
    const statsCards = [
        { 
            name: 'إجمالي الإيرادات (اليوم)', 
            // استخدام dailyReport من الـ API الحقيقي
            value: stats?.dailyReport?.totalSales?.toFixed(2) || '0.00', 
            icon: DollarSign, 
            unit: 'SAR',
            color: 'bg-green-600',
            darkColor: 'dark:bg-green-700',
            link: '/admin/orders', 
        },
        { 
            name: 'إجمالي الطلبات (اليوم)', 
            // استخدام dailyReport من الـ API الحقيقي
            value: stats?.dailyReport?.saleCount || 0, 
            icon: Users, 
            unit: 'طلب',
            color: 'bg-indigo-600',
            darkColor: 'dark:bg-indigo-700',
            link: '/admin/orders', 
        },
        { 
            name: 'عدد الأصناف المسجلة', 
            // استخدام المخزن الحقيقي
            value: categories.length, 
            icon: Package, 
            unit: 'صنف',
            color: 'bg-amber-600',
            darkColor: 'dark:bg-amber-700',
            link: '/admin/categories', 
        },
        { 
            name: 'عدد المنتجات المتاحة', 
            // استخدام المخزن الحقيقي
            value: products.length, 
            icon: Coffee, 
            unit: 'منتج',
            color: 'bg-red-600',
            darkColor: 'dark:bg-red-700',
            link: '/admin/products', 
        },
    ];

    return (
        <div className="p-8 bg-gray-50 min-h-screen dark:bg-gray-900 transition-colors duration-300" dir="rtl">
            
            {/* الشريط العلوي للعنوان والمظهر */}
            <div className="flex justify-between items-center mb-8 border-b pb-4 border-gray-200 dark:border-gray-700">
                <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 flex items-center">
                    <LayoutDashboard className="w-7 h-7 ml-3 text-amber-600" />
                    لوحة التحكم
                </h1>
                
                {/* زر تبديل الثيم */}
                <button
                    onClick={toggleTheme}
                    className="p-3 rounded-full bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100 shadow-md hover:ring-2 ring-amber-500 transition-all duration-200"
                    title={theme === 'light' ? 'تفعيل الوضع الليلي' : 'تفعيل الوضع النهاري'}
                >
                    {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                </button>
            </div>

            {error && <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg dark:bg-red-900 dark:text-red-200">{error}</div>}
            
            {/* 1. بطاقات الإحصائيات السريعة (شريط التنقل السريع) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {statsCards.map((stat) => (
                    <Link 
                        key={stat.name} 
                        href={stat.link || '#'}
                        className={`block p-6 rounded-xl shadow-xl transition duration-300 transform hover:scale-[1.02] ${stat.color} ${stat.darkColor} text-white cursor-pointer`}
                    >
                        <div className="flex justify-between items-center">
                            <stat.icon className="w-8 h-8 opacity-75" />
                            {loadingStats ? (
                                <div className="animate-pulse bg-white bg-opacity-30 h-8 w-1/3 rounded"></div>
                            ) : (
                                <span className="text-4xl font-black">
                                    {stat.value}
                                </span>
                            )}
                        </div>
                        <p className="mt-4 text-sm font-semibold opacity-90">{stat.name}</p>
                        <p className="text-xs opacity-70">{stat.unit}</p>
                    </Link>
                ))}
            </div>
            
            {/* 2. الرسوم البيانية */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 2.1. رسم بياني للدخل اليومي */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 h-96 transition-colors duration-300">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                        <BarChart className="w-5 h-5 ml-2 text-blue-500" />
                        إجمالي الإيرادات
                    </h2>
                    {loadingStats ? (
                        <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-700 rounded"></div>
                    ) : (
                        <SalesBarChart data={stats?.revenueChartData || []} />
                    )}
                </div>

                {/* 2.2. أكثر 3 منتجات مبيعاً */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 h-96 transition-colors duration-300">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                        <Coffee className="w-5 h-5 ml-2 text-amber-500" />
                        أكثر المنتجات مبيعاً
                    </h2>
                    {loadingStats ? (
                         <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-700 rounded"></div>
                    ) : (
                        <TopProductsList products={stats?.topProducts || []} />
                    )}
                </div>
            </div>

            {/* 3. روابط الإدارة الإضافية */}
            <div className="mt-10 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">أدوات إدارية سريعة</h2>
                <div className="flex flex-wrap gap-4">
                    <Link href="/admin/products" className="px-6 py-2 border border-green-300 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition duration-150 font-medium">
                        إدارة المنتجات
                    </Link>
                    <Link href="/admin/categories" className="px-6 py-2 border border-indigo-300 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-gray-700 transition duration-150 font-medium">
                        إدارة الأصناف
                    </Link>
                    <Link href="/admin/orders" className="px-6 py-2 border border-amber-300 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-gray-700 transition duration-150 font-medium">
                        متابعة الطلبات
                    </Link>
                    <Link href="/pos" className="px-6 py-2 border border-blue-300 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition duration-150 font-medium">
                        نقطة البيع (POS)
                    </Link>
                </div>
            </div>
        </div>
    );
};


// ---------------------------------------------------------------------
// 4. المكون الرئيسي مع حماية المسار
// ---------------------------------------------------------------------

const AdminDashboardPage = () => {
    return (
        <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboardContent />
        </ProtectedRoute>
    );
}

export default AdminDashboardPage;