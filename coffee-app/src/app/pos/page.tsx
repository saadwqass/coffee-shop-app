'use client';

import React, { useEffect, useState, useMemo } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
// استيراد المتاجر والمكونات اللازمة
import { useCartStore, FEES, CartItem, VAT_RATE } from '@/store/cartStore'; 
import { useProductStore, Product } from '@/store/productStore';
import { fetchData } from '@/lib/api';
import { useUserStore } from '@/store/userStore'; 
import { ShoppingCart, DollarSign, CreditCard, X, TrendingUp, Package, Loader2, Trash2 } from 'lucide-react'; 

// ---------------------------------------------------------------------
// 1. مكون عرض المنتجات (Product Grid)
// ---------------------------------------------------------------------

interface ProductGridProps {
    products: Product[];
    addItemToCart: (product: Product) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, addItemToCart }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = useMemo(() => {
        // فلترة المنتجات المتاحة والتي لديها مخزون
        let availableProducts = products.filter(p => p.isAvailable && p.stock !== undefined && p.stock >= 0);

        if (!searchTerm) return availableProducts;
        
        return availableProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    return (
        <div className="flex flex-col h-full">
            <input 
                type="text"
                placeholder="ابحث عن منتج..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 mb-4 border rounded-xl shadow-sm focus:border-amber-500 focus:ring-amber-500 text-right"
                dir="rtl"
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto p-1 flex-grow">
                {filteredProducts.length === 0 && (
                    <p className="col-span-4 text-center text-gray-500 py-10">
                       <Package className="w-8 h-8 mx-auto mb-2 text-gray-400"/> 
                       لا توجد منتجات متاحة أو تطابق البحث.
                    </p>
                )}
                {filteredProducts.map(product => (
                    // تم تعطيل زر المنتج إذا كان المخزون صفرًا
                    <button
                        key={product.id}
                        onClick={() => addItemToCart(product)}
                        disabled={product.stock !== undefined && product.stock <= 0}
                        className={`
                            flex flex-col items-center justify-between p-3 rounded-xl shadow-lg transition duration-150 transform hover:scale-[1.02] min-h-[150px]
                            ${product.stock !== undefined && product.stock > 0 ? 'bg-white hover:shadow-xl' : 'bg-gray-200 cursor-not-allowed opacity-60'}
                        `}
                    >
                        <img 
                            src={product.imageUrl || 'https://placehold.co/100x100/A0522D/white?text=Coffee'} 
                            alt={product.name} 
                            className="w-full h-24 object-cover rounded-lg mb-2" 
                        />
                        <span className="text-sm font-semibold text-gray-800 text-center truncate w-full">{product.name}</span>
                        <span className="text-xs text-green-600 font-bold mt-1">{product.price.toFixed(2)} ر.س</span>
                        {product.stock !== undefined && product.stock <= 5 && product.stock > 0 && (
                            <span className="text-xs text-red-500">المخزون: {product.stock}</span>
                        )}
                        {product.stock === 0 && (
                            <span className="text-xs text-red-700 font-bold">نفد المخزون</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------
// 2. مكون ملخص العربة (Cart Summary)
// ---------------------------------------------------------------------

const CartSummary = () => {
    const { items, totalPriceExVAT, totalVatAmount, totalAmount, removeItem, updateQuantity, clearCart, getFees } = useCartStore();
    const { user } = useUserStore();
    const { decreaseStockLocally } = useProductStore(); 
    
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mada' | 'visa_master'>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastSaleError, setLastSaleError] = useState<string | null>(null);

    const feeAmount = getFees(paymentMethod);
    const finalCustomerTotal = totalAmount; 
    
    // دالة إتمام البيع
    const handleCheckout = async () => {
        if (items.length === 0) {
            setLastSaleError('الرجاء إضافة منتجات للعربة أولاً.');
            return;
        }
        
        // التحقق من المناوبة
        if (!user?.shiftId) {
             setLastSaleError('يجب عليك تسجيل الدخول في مناوبة حالية لإتمام البيع.');
             return;
        }

        setIsProcessing(true);
        setLastSaleError(null);

        const salePayload = {
            shiftId: user.shiftId,
            items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
            paymentMethod,
        };

        try {
            await fetchData('/api/sales', 'POST', salePayload);
            
            // 🏆 مهم: تحديث المخزون محلياً بعد إتمام البيع
            decreaseStockLocally(items);
            
            clearCart();
            alert(`✅ تمت عملية البيع بنجاح! الإجمالي: ${finalCustomerTotal.toFixed(2)} ر.س`);
        } catch (error: any) {
            console.error('Sale failed:', error);
            const message = error.message || 'فشل إتمام عملية البيع بسبب خطأ غير معروف في الخادم.';
            setLastSaleError(message);
        } finally {
            setIsProcessing(false);
        }
    };
    
    // مكون عرض عنصر في العربة
    const CartItemDisplay: React.FC<{ item: CartItem }> = ({ item }) => (
        <div className="flex items-center justify-between py-2 border-b last:border-b-0">
            <div className="flex-grow">
                <p className="font-semibold text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-500">{item.price.toFixed(2)} ر.س (شامل)</p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 text-gray-600 border rounded-md hover:bg-gray-100"
                    disabled={item.quantity <= 1}
                >
                    -
                </button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 text-gray-600 border rounded-md hover:bg-gray-100"
                >
                    +
                </button>
            </div>
            <button
                onClick={() => removeItem(item.id)}
                className="ml-3 text-red-500 hover:text-red-700 p-1 rounded-full"
                title="إزالة المنتج"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );


    return (
        <div className="bg-white p-6 rounded-xl shadow-2xl h-full flex flex-col" dir="rtl">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2 flex items-center">
                <ShoppingCart className="w-6 h-6 ml-2 text-amber-500" />
                العربة ({items.length})
            </h2>

            {/* قائمة العناصر */}
            <div className="flex-grow overflow-y-auto mb-4">
                {items.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">
                        <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p>العربة فارغة. ابدأ بإضافة المنتجات.</p>
                    </div>
                ) : (
                    items.map(item => <CartItemDisplay key={item.id} item={item} />)
                )}
            </div>
            
            {/* رسالة الخطأ */}
            {lastSaleError && <div className="p-3 mb-3 bg-red-100 text-red-700 rounded-lg text-sm">{lastSaleError}</div>}


            {/* 3. ملخص الحسابات (لتقارير المدير) */}
            <div className="border-t pt-4 space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                    <span>الإجمالي الفرعي (قبل الضريبة):</span>
                    <span className="font-medium">{totalPriceExVAT.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between">
                    <span>ضريبة القيمة المضافة ({VAT_RATE * 100}%):</span>
                    <span className="font-medium">{totalVatAmount.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2">
                    <span>المبلغ المستحق (شامل):</span>
                    <span>{finalCustomerTotal.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                    <span>رسوم الدفع (تكلفة على المتجر):</span>
                    <span>{feeAmount.toFixed(2)} ر.س</span>
                </div>
            </div>

            {/* 4. اختيار طريقة الدفع */}
            <div className="mt-4 border-t pt-4">
                <h3 className="text-md font-semibold mb-2">طريقة الدفع:</h3>
                <div className="grid grid-cols-3 gap-2">
                    <PaymentButton 
                        method="cash" 
                        icon={DollarSign} 
                        label="نقداً" 
                        current={paymentMethod} 
                        onClick={setPaymentMethod} 
                    />
                    <PaymentButton 
                        method="mada" 
                        icon={CreditCard} 
                        label="مدى" 
                        current={paymentMethod} 
                        onClick={setPaymentMethod} 
                    />
                    <PaymentButton 
                        method="visa_master" 
                        icon={CreditCard} 
                        label="فيزا/ماستر" 
                        current={paymentMethod} 
                        onClick={setPaymentMethod} 
                    />
                </div>
            </div>
            
            {/* 5. زر إتمام البيع ومسح العربة */}
            <div className="mt-6 flex gap-3">
                <button
                    onClick={clearCart}
                    className="flex-none p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition"
                    title="مسح العربة"
                    disabled={items.length === 0 || isProcessing}
                >
                    <Trash2 className="w-5 h-5" />
                </button>
                <button
                    onClick={handleCheckout}
                    disabled={items.length === 0 || isProcessing}
                    className="flex-grow flex items-center justify-center px-6 py-4 bg-amber-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-amber-700 transition disabled:bg-gray-400"
                >
                    {isProcessing ? (
                        <Loader2 className="w-6 h-6 animate-spin ml-2" />
                    ) : (
                        <TrendingUp className="w-6 h-6 ml-2" />
                    )}
                    {isProcessing ? 'جاري المعالجة...' : `إتمام البيع (${finalCustomerTotal.toFixed(2)} ر.س)`}
                </button>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------
// 3. مكون زر الدفع (مساعد)
// ---------------------------------------------------------------------

interface PaymentButtonProps {
    method: 'cash' | 'mada' | 'visa_master';
    icon: React.ElementType;
    label: string;
    current: string;
    onClick: (method: 'cash' | 'mada' | 'visa_master') => void;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({ method, icon: Icon, label, current, onClick }) => (
    <button
        onClick={() => onClick(method)}
        className={`flex flex-col items-center p-3 rounded-xl border-2 transition text-center min-h-[70px]
            ${current === method ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-lg' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}
        `}
    >
        <Icon className="w-5 h-5 mb-1" />
        <span className="text-xs font-semibold">{label}</span>
    </button>
);


// ---------------------------------------------------------------------
// 4. المكون الرئيسي لصفحة POS
// ---------------------------------------------------------------------

const POSContent = () => {
    const { products, loading, error, fetchProducts } = useProductStore(); 
    const { addItem } = useCartStore();

    useEffect(() => {
        // جلب المنتجات عند تحميل واجهة POS لأول مرة
        fetchProducts(); 
    }, [fetchProducts]);
    
    // دالة مساعدة لإضافة المنتج للعربة بكمية 1
    const addItemToCart = (product: Product) => {
        // منع الإضافة إذا كان المخزون 0
        if (product.stock === 0) return; 

        addItem(product, 1);
    };

    if (loading) {
        return <div className="text-center p-10 text-lg">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-amber-600" />
            جاري تحميل المنتجات...
            </div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-600">خطأ في تحميل المنتجات: {error}</div>;
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {/* القسم الأيمن: المنتجات */}
            <div className="flex-1 p-6 bg-gray-100 overflow-y-hidden">
                <ProductGrid products={products} addItemToCart={addItemToCart} />
            </div>

            {/* القسم الأيسر: العربة والدفع */}
            <div className="w-full md:w-[420px] flex-none border-r border-gray-200 shadow-2xl">
                <CartSummary />
            </div>
        </div>
    );
};


// ---------------------------------------------------------------------
// 5. حماية المسار والتصدير
// ---------------------------------------------------------------------

const POSPage = () => {
    // يجب أن يكون البائع (seller) أو المدير (admin) مخولاً باستخدام POS
    return (
        <ProtectedRoute allowedRoles={['seller', 'admin']}>
            <POSContent />
        </ProtectedRoute>
    );
}

export default POSPage;