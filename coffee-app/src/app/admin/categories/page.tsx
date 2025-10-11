'use client';

// 1. جميع الاستيرادات في البداية
import React, { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute'; 
import { useCategoryStore, Category } from '@/store/categoryStore'; 
import { fetchData } from '@/lib/api'; 
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';

// ---------------------------------------------------------------------
// 1. مكون صفحة إدارة الأصناف الفعلية
// ---------------------------------------------------------------------

const AdminCategoriesContent = () => {
    const { 
        categories, 
        loading, 
        error, 
        setError,
        addCategoryLocally,
        updateCategoryLocally,
        deleteCategoryLocally,
        fetchCategories 
    } = useCategoryStore();
    
    // حالات إدارة النموذج والإضافة
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // 🏆 نستخدم useCallback لتخزين دالة الجلب وتجنب إعادة الإنشاء
    const memoizedFetchCategories = useCallback(() => {
        fetchCategories();
    }, [fetchCategories]); // يعتمد فقط على الدالة من Zustand

    // 🏆 جلب الأصناف عند تحميل المكون
    useEffect(() => {
        memoizedFetchCategories();
    }, [memoizedFetchCategories]); // عند التحميل الأولي فقط

    // 🏆 دالة إضافة صنف جديد
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        setIsAdding(true);
        setError(null);
        try {
            const newCategory: Category = await fetchData( 
                '/api/admin/categories', 
                'POST', 
                { name: newCategoryName }
            );
            
            addCategoryLocally(newCategory);
            setNewCategoryName('');
        } catch (err: any) {
            setError(err.message || 'فشل إضافة الصنف.');
        } finally {
            setIsAdding(false);
        }
    };

    // 🏆 دالة تعديل اسم صنف
    const handleUpdateCategory = async (id: string) => {
        if (!editingName.trim() || loading) return;

        // لا داعي لضبط حالة تحميل عامة إذا كنا نعدل عنصر واحد
        // يمكننا استخدام حالة 'isSubmitting' هنا إذا أردنا
        setError(null);
        try {
            await fetchData(
                `/api/admin/categories/${id}`, 
                'PUT', 
                { name: editingName }
            );
            
            updateCategoryLocally(id, editingName);
            setEditingId(null);
        } catch (err: any) {
            setError(err.message || 'فشل تعديل الصنف.');
        }
    };

    // 🏆 دالة حذف صنف
    const handleDeleteCategory = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;

        // يمكن استخدام حالة تحميل هنا بشكل خاص
        setError(null);
        try {
            await fetchData(
                `/api/admin/categories/${id}`, 
                'DELETE'
            );
            
            deleteCategoryLocally(id);
        } catch (err: any) {
            setError(err.message || 'فشل حذف الصنف. تأكد من عدم وجود منتجات مرتبطة به.');
        }
    };

    // بدء التعديل
    const startEditing = (category: Category) => {
        setEditingId(category.id);
        setEditingName(category.name);
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2 text-right">
                إدارة أصناف المنتجات
            </h1>

            {/* رسائل الحالة */}
            {error && <div dir="rtl" className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg text-right">{error}</div>}
            {loading && <div dir="rtl" className="p-4 mb-4 bg-blue-100 text-blue-700 rounded-lg text-right">جاري التحميل...</div>}

            {/* نموذج إضافة صنف جديد */}
            <form onSubmit={handleAddCategory} className="flex gap-4 mb-8 bg-white p-4 rounded-xl shadow-lg border border-gray-100" dir="rtl">
                <input
                    type="text"
                    placeholder="اسم الصنف الجديد (مثل: مشروبات باردة)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-right"
                    required
                />
                <button
                    type="submit"
                    disabled={isAdding || loading}
                    className="flex items-center justify-center px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg shadow-md hover:bg-amber-700 disabled:bg-gray-400 transition duration-150"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {isAdding ? 'جاري الإضافة...' : 'إضافة صنف'}
                </button>
            </form>

            {/* قائمة الأصناف */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100" dir="rtl">
                <div className="grid grid-cols-1 gap-4">
                    {categories.map((category) => (
                        <div 
                            key={category.id} 
                            className="flex justify-between items-center p-4 border-b last:border-b-0 hover:bg-gray-50 rounded-lg transition duration-100"
                        >
                            {editingId === category.id ? (
                                // وضع التعديل
                                <div className="flex-grow flex gap-2">
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className="flex-grow p-2 border border-blue-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-right"
                                    />
                                </div>
                            ) : (
                                // وضع العرض العادي
                                <span className="text-lg font-medium text-gray-800">
                                    {category.name}
                                </span>
                            )}

                            {/* أزرار الإجراءات */}
                            <div className="flex gap-2">
                                {editingId === category.id ? (
                                    <>
                                        <button
                                            onClick={() => handleUpdateCategory(category.id)}
                                            disabled={loading || isAdding} // تعطيل أثناء العمليات الأخرى
                                            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50"
                                            title="حفظ"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            disabled={loading || isAdding}
                                            className="p-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 disabled:opacity-50"
                                            title="إلغاء"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => startEditing(category)}
                                            disabled={loading || isAdding}
                                            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50"
                                            title="تعديل"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCategory(category.id)}
                                            disabled={loading || isAdding}
                                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
                                            title="حذف"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {categories.length === 0 && !loading && !error && (
                        <p className="text-center text-gray-500 py-4">لا توجد أصناف حالياً. قم بإضافة صنف جديد.</p>
                    )}
                </div>
            </div>
        </div>
    );
};


// ---------------------------------------------------------------------
// 2. المكون الرئيسي مع حماية المسار
// ---------------------------------------------------------------------

const AdminCategoriesPage = () => {
    return (
        <ProtectedRoute allowedRoles={['admin']}>
            <AdminCategoriesContent />
        </ProtectedRoute>
    );
}

// 🏆 التصدير الافتراضي
export default AdminCategoriesPage;