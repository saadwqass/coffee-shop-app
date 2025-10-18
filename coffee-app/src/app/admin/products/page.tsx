'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useProductStore, Product, ProductPayload } from '@/store/productStore';
import { useCategoryStore, Category } from '@/store/categoryStore';
import { fetchData } from '@/lib/api';
import { Plus, Trash2, Edit, Save, X, DollarSign, Package, Search, Loader2 } from 'lucide-react'; 
import './products.css';

// ---------------------------------------------------------------------
// 1. مكون صفحة إدارة المنتجات الفعلية
// ---------------------------------------------------------------------

const AdminProductsContent = () => {
    // جلب حالة المنتجات وإجراءاتها
    const { 
        products, 
        loading, 
        error, 
        setProducts, 
        setLoading, 
        setError,
        addProductLocally,
        updateProductLocally,
        deleteProductLocally
    } = useProductStore();
    
    // جلب الأصناف من مخزن الأصناف
    const { 
        categories, 
        fetchCategories: fetchCategoriesStore,
        loading: categoriesLoading 
    } = useCategoryStore();

    // حالات إدارة النموذج والإضافة والتعديل
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null); // 🆕 حالة للحذف الفردي

    // 🏆 حالات جديدة للبحث والتصفية
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategoryId, setFilterCategoryId] = useState('ALL');

    // حالة النموذج الموحدة للإضافة والتعديل
    const [formData, setFormData] = useState<ProductPayload>({
        name: '',
        description: '',
        price: 0,
        imageUrl: '',
        stock: 0,
        isAvailable: true,
        categoryId: '',
    });

    // 🏆 دالة جلب المنتجات المحسنة
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const productsData: Product[] = await fetchData('/api/admin/products'); 
            
            // 🛠️ الإصلاح: جلب الأصناف بشكل منفصل إذا لم تكن موجودة
            let categoriesData = categories;
            if (categories.length === 0) {
                categoriesData = await fetchData('/api/admin/categories');
            }
            
            // ربط معلومات الصنف بالمنتج
            const productsWithCategory = productsData.map(product => ({
                ...product,
                category: categoriesData.find((c: Category) => c.id === product.categoryId) || 
                         { id: product.categoryId, name: 'غير محدد' } as Category,
            }));

            setProducts(productsWithCategory);
        } catch (err: any) {
            setError(err.message || 'فشل تحميل المنتجات.');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [setLoading, setError, setProducts]); // 🛠️ الإصلاح: إزالة categories من التبعيات

    // 🛠️ الإصلاح: جلب البيانات الأولية بشكل صحيح
    useEffect(() => {
        const initializeData = async () => {
            try {
                // جلب الأصناف أولاً ثم المنتجات
                await fetchCategoriesStore();
                await fetchProducts();
            } catch (error) {
                console.error('Failed to initialize data:', error);
            }
        };
        
        initializeData();
    }, []); // 🛠️ الإصلاح: إزالة التبعيات لمنع الحلقات اللانهائية

    // معالجة تغيير حقول النموذج
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (type === 'number' || name === 'price' || name === 'stock') 
                    ? parseFloat(value) || 0 // 🛠️ الإصلاح: ضمان عدم وجود NaN
                    : (type === 'checkbox' ? (e.target as HTMLInputElement).checked : value)
        }));
    };
    
    // بدء وضع التعديل
    const startEditing = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description || '',
            price: product.price,
            imageUrl: product.imageUrl || '',
            stock: product.stock,
            isAvailable: product.isAvailable,
            categoryId: product.categoryId,
        });
        setIsFormVisible(true);
    };

    // إلغاء الوضع
    const cancelAction = () => {
        setEditingProduct(null);
        setIsFormVisible(false);
        setFormData({ 
            name: '', 
            description: '', 
            price: 0, 
            imageUrl: '', 
            stock: 0, 
            isAvailable: true, 
            categoryId: '' 
        });
    };

    // 🏆 دالة الإضافة والتعديل النهائية المحسنة
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        // 🛠️ الإصلاح: تحقق إضافي من صحة البيانات
        if (!formData.name.trim()) {
            setError('اسم المنتج مطلوب.');
            setIsSubmitting(false);
            return;
        }

        if (!formData.categoryId) {
            setError('الرجاء اختيار صنف للمنتج.');
            setIsSubmitting(false);
            return;
        }

        if (formData.price < 0) {
            setError('السعر لا يمكن أن يكون سالباً.');
            setIsSubmitting(false);
            return;
        }

        if (formData.stock < 0) {
            setError('الكمية في المخزون لا يمكن أن تكون سالبة.');
            setIsSubmitting(false);
            return;
        }

        const method = editingProduct ? 'PUT' : 'POST';
        const url = editingProduct 
            ? `/api/admin/products/${editingProduct.id}` 
            : '/api/admin/products';

        try {
            const result: Product = await fetchData(url, method, formData);
            
            // ربط معلومات الصنف قبل التحديث المحلي
            const categoryInfo = categories.find((c: Category) => c.id === result.categoryId) || 
                               { id: result.categoryId, name: 'غير محدد' };

            // تحديث الحالة محلياً
            if (editingProduct) {
                updateProductLocally(result.id, { ...result, category: categoryInfo });
            } else {
                addProductLocally({ ...result, category: categoryInfo });
            }
            
            cancelAction();
        } catch (err: any) {
            setError(err.message || 'فشل تنفيذ العملية.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // 🏆 دالة حذف منتج محسنة
    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

        setDeletingProductId(id); // 🆕 تتبع المنتج الذي يتم حذفه
        setError(null);
        try {
            await fetchData(`/api/admin/products/${id}`, 'DELETE');
            deleteProductLocally(id);
        } catch (err: any) {
            setError(err.message || 'فشل حذف المنتج.');
        } finally {
            setDeletingProductId(null); // 🆕 إعادة تعيين حالة الحذف
        }
    };

    // 🏆 منطق التصفية والبحث
    const filteredProducts = useMemo(() => {
        let currentProducts = products;

        // 1. التصفية حسب الصنف
        if (filterCategoryId !== 'ALL') {
            currentProducts = currentProducts.filter(p => p.categoryId === filterCategoryId);
        }

        // 2. البحث بالاسم أو الوصف
        if (searchTerm.trim() !== '') {
            const lowerCaseSearch = searchTerm.toLowerCase();
            currentProducts = currentProducts.filter(p =>
                p.name.toLowerCase().includes(lowerCaseSearch) ||
                (p.description && p.description.toLowerCase().includes(lowerCaseSearch))
            );
        }

        return currentProducts;
    }, [products, filterCategoryId, searchTerm]);

    return (
        <div className="p-8 bg-gray-50 min-h-screen" dir="rtl">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">
                إدارة قائمة المنتجات
            </h1>

            {/* رسائل الحالة */}
            {error && (
                <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg border border-red-200" dir="rtl">
                    {error}
                </div>
            )}
            
            {(loading || categoriesLoading) && (
                <div className="p-4 mb-4 bg-blue-100 text-blue-700 rounded-lg border border-blue-200" dir="rtl">
                    <div className="flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin ml-2" />
                        جاري التحميل...
                    </div>
                </div>
            )}

            {/* 2. زر إضافة وشريط البحث/التصفية */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                {/* زر إضافة منتج جديد */}
                <button
                    onClick={() => { cancelAction(); setIsFormVisible(true); }}
                    disabled={loading || categoriesLoading}
                    className="flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 transition duration-150"
                >
                    <Plus className="w-5 h-5 ml-2" />
                    إضافة منتج جديد
                </button>
                
                {/* شريط البحث والتصفية */}
                <div className="flex items-center gap-4 flex-grow max-w-lg bg-white p-3 rounded-xl shadow-md border border-gray-200">
                    <Search className="w-5 h-5 text-gray-500" />
                    {/* حقل البحث */}
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو الوصف..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow p-1 text-gray-700 focus:outline-none bg-transparent"
                        dir="rtl"
                        disabled={loading}
                    />
                    {/* فلتر الأصناف */}
                    <select
                        value={filterCategoryId}
                        onChange={(e) => setFilterCategoryId(e.target.value)}
                        className="p-1 border-r border-gray-300 bg-transparent text-sm focus:ring-0 focus:border-0"
                        disabled={loading || categoriesLoading}
                    >
                        <option value="ALL">جميع الأصناف</option>
                        {categories.map((c: Category) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                
                {/* عداد المنتجات */}
                <span className="text-sm text-gray-600">
                    عدد المنتجات المعروضة: {filteredProducts.length}
                </span>
            </div>

            {/* 3. نموذج الإضافة/التعديل */}
            {isFormVisible && (
                <div className="bg-white p-6 mb-6 rounded-xl shadow-xl border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">
                        {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                    </h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* حقل اسم المنتج */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج</label>
                            <input 
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleFormChange} 
                                required 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-150"
                                disabled={isSubmitting}
                            />
                        </div>
                        
                        {/* حقل السعر */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">السعر (ر.س)</label>
                            <input 
                                type="number" 
                                name="price" 
                                value={formData.price} 
                                onChange={handleFormChange} 
                                required 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-150"
                                min="0" 
                                step="0.01"
                                disabled={isSubmitting}
                            />
                        </div>
                        
                        {/* حقل الصنف */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
                            <select 
                                name="categoryId" 
                                value={formData.categoryId} 
                                onChange={handleFormChange} 
                                required 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-150"
                                disabled={isSubmitting || categoriesLoading}
                            >
                                <option value="">--- اختر صنفا ---</option>
                                {categories.map((c: Category) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* حقل الكمية في المخزون */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الكمية في المخزون</label>
                            <input 
                                type="number" 
                                name="stock" 
                                value={formData.stock} 
                                onChange={handleFormChange} 
                                required 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-150"
                                min="0"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* حقل متاح للبيع */}
                        <div className="flex items-center space-x-2 md:col-span-2">
                            <input 
                                type="checkbox" 
                                name="isAvailable" 
                                checked={formData.isAvailable} 
                                onChange={handleFormChange} 
                                className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                disabled={isSubmitting}
                            />
                            <label className="text-sm font-medium text-gray-700">متاح للبيع؟</label>
                        </div>

                        {/* حقل وصف المنتج */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف (اختياري)</label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleFormChange} 
                                rows={3} 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-150"
                                disabled={isSubmitting}
                            ></textarea>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={cancelAction}
                                disabled={isSubmitting}
                                className="px-6 py-2 flex items-center border border-gray-300 rounded-lg shadow-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition duration-150"
                            >
                                <X className="w-5 h-5 ml-2" />
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 flex items-center bg-amber-600 text-white font-semibold rounded-lg shadow-md hover:bg-amber-700 disabled:bg-gray-400 transition duration-150"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                                        جاري الحفظ...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 ml-2" />
                                        {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* 4. قائمة المنتجات (تعرض المنتجات المفلترة) */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="grid grid-cols-1 gap-4">
                    {filteredProducts.map((product) => (
                        <div 
                            key={product.id} 
                            className={`flex justify-between items-center p-4 border-b last:border-b-0 rounded-lg transition duration-150 ${
                                !product.isAvailable ? 'bg-red-50 opacity-75' : 'hover:bg-gray-50'
                            }`}
                        >
                            {/* معلومات المنتج */}
                            <div className="flex-grow">
                                <span className="text-lg font-bold text-gray-800 block">{product.name}</span>
                                <p className="text-sm text-gray-500 mt-1">الصنف: {product.category.name}</p>
                                <div className="flex items-center text-sm text-gray-600 mt-2">
                                    <DollarSign className="w-4 h-4 ml-1" />
                                    <span className="ml-1">{product.price.toFixed(2)} ر.س</span>
                                    <Package className="w-4 h-4 mx-3" />
                                    <span>الكمية: {product.stock}</span>
                                    {!product.isAvailable && (
                                        <span className="mr-3 text-red-600 font-semibold">● غير متاح</span>
                                    )}
                                </div>
                                {product.description && (
                                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>
                                )}
                            </div>

                            {/* أزرار الإجراءات */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => startEditing(product)}
                                    disabled={loading || isSubmitting || deletingProductId !== null}
                                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 transition duration-150"
                                    title="تعديل المنتج"
                                >
                                    <Edit className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    disabled={loading || isSubmitting || deletingProductId !== null}
                                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50 transition duration-150"
                                    title="حذف المنتج"
                                >
                                    {deletingProductId === product.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredProducts.length === 0 && !loading && !error && (
                        <p className="text-center text-gray-500 py-8 text-lg">
                            {searchTerm || filterCategoryId !== 'ALL' 
                                ? 'لا توجد منتجات مطابقة لفلتر البحث حالياً.' 
                                : 'لا توجد منتجات مسجلة. ابدأ بإضافة منتج جديد.'
                            }
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------
// 2. المكون الرئيسي مع حماية المسار
// ---------------------------------------------------------------------

const AdminProductsPage = () => {
    return (
        <ProtectedRoute allowedRoles={['admin']}>
            <AdminProductsContent />
        </ProtectedRoute>
    );
}

export default AdminProductsPage;