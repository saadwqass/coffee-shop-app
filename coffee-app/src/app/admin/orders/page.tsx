'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { fetchData } from '@/lib/api';
import { Loader2, Package, Search, CheckCircle, Clock, XCircle, ShoppingBag, RotateCw } from 'lucide-react'; // استيراد RotateCw

// ---------------------------------------------------------------------
// 1. تحديد أنواع البيانات
// ---------------------------------------------------------------------

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELED';

interface OrderItem {
    id: string;
    productName: string;
    quantity: number;
    price: number; 
}

interface Order {
    id: string;
    totalAmount: number;
    paymentMethod: 'cash' | 'mada' | 'visa_master';
    status: OrderStatus;
    createdAt: string; 
    shiftId: string;
    items: OrderItem[];
}

// ---------------------------------------------------------------------
// 2. مكون جدول عرض الطلبات (Order Table)
// ---------------------------------------------------------------------

interface OrderTableProps {
    orders: Order[];
    updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
    isUpdating: boolean;
}

const OrderTable: React.FC<OrderTableProps> = ({ orders, updateOrderStatus, isUpdating }) => {
    // 💡 دالة مساعدة لتحويل حالة الطلب إلى نص ولون
    const getStatusDisplay = (status: OrderStatus) => {
        switch (status) {
            case 'PENDING': return { text: 'بانتظار التحضير', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
            case 'PREPARING': return { text: 'قيد التحضير', color: 'bg-blue-100 text-blue-800', icon: Loader2 };
            case 'READY': return { text: 'جاهز للاستلام', color: 'bg-green-100 text-green-800', icon: CheckCircle };
            case 'COMPLETED': return { text: 'مكتمل', color: 'bg-gray-100 text-gray-700', icon: CheckCircle };
            case 'CANCELED': return { text: 'ملغي', color: 'bg-red-100 text-red-800', icon: XCircle };
            default: return { text: 'غير معروف', color: 'bg-gray-100 text-gray-500', icon: Package };
        }
    };

    // 💡 عرض تفاصيل الطلب (Items)
    const OrderItemsList: React.FC<{ items: OrderItem[] }> = ({ items }) => (
        <ul className="list-disc pr-5 mt-1 text-sm text-gray-600">
            {items.map((item) => (
                <li key={item.id}>
                    {item.productName} ({item.quantity}x)
                </li>
            ))}
        </ul>
    );

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden h-full flex flex-col">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200" dir="rtl">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                # الطلب
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الحالة
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الإجمالي
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                التفاصيل
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الإجراءات
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                    لا توجد طلبات لعرضها حالياً.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => {
                                const { text, color, icon: StatusIcon } = getStatusDisplay(order.status);
                                const isActionDisabled = isUpdating || order.status === 'COMPLETED' || order.status === 'CANCELED';
                                // 🌟 التحسين: تمييز الطلبات العاجلة (PENDING)
                                const isUrgent = order.status === 'PENDING' || order.status === 'PREPARING';
                                
                                return (
                                    <tr 
                                        key={order.id} 
                                        className={`hover:bg-gray-50 transition-colors ${isUrgent ? 'border-r-4 border-amber-500 bg-amber-50' : ''}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {order.id.substring(0, 8)}...
                                            <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleTimeString('ar-SA')}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${color}`}>
                                                <StatusIcon className="w-3 h-3 ml-1" />
                                                {text}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-bold">
                                            {order.totalAmount.toFixed(2)} ر.س
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-800">
                                            <OrderItemsList items={order.items} />
                                            <div className="text-xs text-gray-500 mt-1">طريقة: {order.paymentMethod === 'cash' ? 'نقداً' : 'بطاقة'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            {/* زر تحديث الحالة */}
                                            {order.status !== 'COMPLETED' && order.status !== 'CANCELED' && (
                                                <button
                                                    onClick={() => {
                                                        const nextStatus: OrderStatus = order.status === 'PENDING' ? 'PREPARING' : 'READY';
                                                        updateOrderStatus(order.id, nextStatus);
                                                    }}
                                                    disabled={isActionDisabled}
                                                    className={`
                                                        px-4 py-2 rounded-lg text-white text-xs font-semibold transition duration-150
                                                        ${isActionDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'}
                                                    `}
                                                >
                                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : order.status === 'PENDING' ? 'بدء التحضير' : 'جعله جاهزاً'}
                                                </button>
                                            )}
                                            {order.status === 'READY' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                                                    disabled={isActionDisabled}
                                                    className={`
                                                        mt-2 block px-4 py-2 rounded-lg text-white text-xs font-semibold transition duration-150
                                                        ${isActionDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
                                                    `}
                                                >
                                                    تسليم وإكمال
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------
// 3. المكون الرئيسي لصفحة الطلبات (Orders Page)
// ---------------------------------------------------------------------

const OrdersContent = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [isUpdating, setIsUpdating] = useState(false);
    // 🌟 التحسين: حالة لتتبع عدد الطلبات التي تم جلبها آخر مرة
    const [lastFetchCount, setLastFetchCount] = useState(0); 
    const [newOrdersIndicator, setNewOrdersIndicator] = useState(0);

    // 💡 دالة فرز الطلبات (مفصولة لتجنب التكرار)
    const sortOrders = (data: Order[]) => {
        return data.sort((a, b) => {
            // ترتيب الحالات: الجاهز أولاً، ثم قيد التحضير، ثم الانتظار، ثم المكتمل/الملغي
            const statusOrder = ['READY', 'PREPARING', 'PENDING', 'COMPLETED', 'CANCELED'];
            if (a.status !== b.status) {
                return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
            }
            // الأحدث أولاً
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    };
    
    // 💡 دالة جلب الطلبات من الـ API (مع استخدام useCallback)
    const fetchOrders = useCallback(async (isManualRefresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const data: Order[] = await fetchData('/api/admin/sales');
            const sortedData = sortOrders(data);
            
            // 🌟 التحسين: مقارنة عدد الطلبات لتحديد الطلبات الجديدة
            if (!isManualRefresh && sortedData.length > lastFetchCount && lastFetchCount !== 0) {
                setNewOrdersIndicator(sortedData.length - lastFetchCount);
            } else if (isManualRefresh) {
                setNewOrdersIndicator(0); // إزالة الإشعار عند التحديث اليدوي
            }

            setOrders(sortedData);
            setLastFetchCount(sortedData.length);
        } catch (err: any) {
            console.error('Failed to fetch orders:', err);
            setError(err.message || 'فشل تحميل الطلبات.');
        } finally {
            setLoading(false);
        }
    }, [lastFetchCount]); // يعتمد على lastFetchCount لمقارنة العدد

    // 💡 دالة تحديث حالة الطلب
    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        setIsUpdating(true);
        try {
            await fetchData(`/api/admin/sales/${orderId}/status`, 'PUT', { status: newStatus });
            
            // تحديث الحالة محلياً ثم إعادة فرز الطلبات لضمان انتقالها للمكان الصحيح في الجدول
            setOrders(prevOrders => {
                const updatedOrders = prevOrders.map(order => 
                    order.id === orderId ? { ...order, status: newStatus } : order
                );
                return sortOrders(updatedOrders);
            });
        } catch (err: any) {
            alert(`فشل تحديث حالة الطلب: ${err.message || 'خطأ غير معروف'}`);
            console.error('Update status failed:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    // جلب الطلبات عند تحميل المكون
    useEffect(() => {
        fetchOrders(true); // جلب أولي
        // 💡 تحديث الطلبات كل 30 ثانية (التحديث التلقائي)
        const intervalId = setInterval(() => fetchOrders(false), 30000); 
        return () => clearInterval(intervalId); // التنظيف
    }, [fetchOrders]);

    // تصفية الطلبات بناءً على الحالة
    const filteredOrders = useMemo(() => {
        if (filterStatus === 'ALL') return orders;
        return orders.filter(order => order.status === filterStatus);
    }, [orders, filterStatus]);
    
    const statusOptions: { value: string, label: string }[] = [
        { value: 'ALL', label: 'جميع الطلبات' },
        { value: 'PENDING', label: 'بانتظار التحضير' },
        { value: 'PREPARING', label: 'قيد التحضير' },
        { value: 'READY', label: 'جاهز للاستلام' },
        { value: 'COMPLETED', label: 'مكتمل' },
        { value: 'CANCELED', label: 'ملغي' },
    ];
    
    const dismissNewOrdersAlert = () => setNewOrdersIndicator(0);
    
    if (loading && orders.length === 0) {
        return <div className="text-center p-10 text-lg flex items-center justify-center h-screen"><Loader2 className="w-6 h-6 animate-spin ml-2" /> جاري تحميل الطلبات...</div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-600">خطأ: {error}</div>;
    }

    return (
        <div className="p-6 h-screen flex flex-col bg-gray-50" dir="rtl">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <ShoppingBag className="w-7 h-7 ml-3 text-amber-600" />
                لوحة تتبع الطلبات
            </h1>
            
            {/* 🌟 التحسين: إشعار الطلبات الجديدة */}
            {newOrdersIndicator > 0 && (
                <div className="p-4 mb-4 bg-amber-500 text-white rounded-xl shadow-lg flex justify-between items-center animate-bounce-once">
                    <span>🔔 لديك **{newOrdersIndicator}** طلب جديد بانتظار التحضير!</span>
                    <button 
                        onClick={dismissNewOrdersAlert} 
                        className="text-sm font-semibold underline opacity-90 hover:opacity-100 p-1 rounded-md transition-colors hover:bg-amber-600"
                    >
                        تمت المشاهدة (إزالة الإشعار)
                    </button>
                </div>
            )}
            
            {/* أداة التصفية والتحديث اليدوي */}
            <div className="mb-6 flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl shadow-md">
                <Search className="w-5 h-5 text-gray-500" />
                <label htmlFor="status-filter" className="font-medium text-gray-700">تصفية حسب الحالة:</label>
                <select
                    id="status-filter"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 transition"
                >
                    {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
                
                {/* 🌟 التحسين: زر التحديث اليدوي */}
                <button 
                    onClick={() => fetchOrders(true)} 
                    disabled={loading || isUpdating}
                    className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 disabled:opacity-50 transition mr-auto"
                >
                    <RotateCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                    تحديث يدوي
                </button>
                
                <span className="text-sm text-gray-600">
                    إجمالي الطلبات المعروضة: {filteredOrders.length}
                </span>
            </div>
            
            {/* الجدول */}
            <div className="flex-grow overflow-y-auto">
                <OrderTable 
                    orders={filteredOrders} 
                    updateOrderStatus={updateOrderStatus} 
                    isUpdating={isUpdating} 
                />
            </div>
        </div>
    );
};


// ---------------------------------------------------------------------
// 4. حماية المسار والتصدير
// ---------------------------------------------------------------------

const OrdersPage = () => {
    return (
        <ProtectedRoute allowedRoles={['admin', 'seller']}>
            <OrdersContent />
        </ProtectedRoute>
    );
}

export default OrdersPage;