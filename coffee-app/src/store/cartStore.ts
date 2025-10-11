

import { create } from 'zustand';
// نفترض أن نوع Product يحمل السعر كـ (السعر الشامل للضريبة)
// للتأكد من التوافق، سنستخدم نفس الثوابت الموجودة في الـ API.
import { Product } from './productStore'; 

// ---------------------------------------------------------------------
// 1. الثوابت المالية (مكررة من API لضمان التوافق)
// ---------------------------------------------------------------------

// 🏆 التصحيح: تم إضافة 'export' لمتغير VAT_RATE
export const VAT_RATE = 0.15; // ضريبة القيمة المضافة 15%
export const FEES: Record<'cash' | 'mada' | 'visa_master', number> = {
    cash: 0,
    mada: 0.00695,
    visa_master: 0.0225,
};

// ---------------------------------------------------------------------
// 2. تعريف أنواع البيانات
// ---------------------------------------------------------------------

export interface CartItem {
    id: string; // id المنتج
    productId: string;
    name: string;
    // السعر هنا هو السعر الشامل للضريبة الذي تم بيعه به
    price: number; 
    quantity: number;
    // حقول داخلية للحسابات
    basePrice: number; // السعر قبل الضريبة
    itemVatAmount: number; // قيمة الضريبة للمنتج الواحد
}

interface CartState {
    items: CartItem[];
    // المجموعات المعروضة للبائع/المدير
    totalPriceExVAT: number; // إجمالي المبيعات قبل الضريبة
    totalVatAmount: number;  // إجمالي الضريبة المحصلة
    totalAmount: number;     // الإجمالي النهائي (السعر الشامل للضريبة)
    
    // الإجراءات
    addItem: (product: Product, quantity?: number) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    getFees: (paymentMethod: keyof typeof FEES) => number; 
}

// ---------------------------------------------------------------------
// 3. دالة مساعدة لحساب الإجماليات
// ---------------------------------------------------------------------

const calculateTotals = (items: CartItem[]): { totalPriceExVAT: number; totalVatAmount: number; totalAmount: number } => {
    let totalPriceExVAT = 0;
    let totalVatAmount = 0;
    let totalAmount = 0;
    
    items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        
        // حساب الإجمالي الأساسي والضريبة من الكمية
        totalPriceExVAT += item.basePrice * item.quantity;
        totalVatAmount += item.itemVatAmount * item.quantity;
    });

    // تقريب جميع النتائج لضمان دقة العمليات المالية
    return {
        totalPriceExVAT: parseFloat(totalPriceExVAT.toFixed(2)),
        totalVatAmount: parseFloat(totalVatAmount.toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
    };
};

// ---------------------------------------------------------------------
// 4. إنشاء مخزن عربة التسوق (Zustand Store)
// ---------------------------------------------------------------------

export const useCartStore = create<CartState>((set, get) => ({
    // الحالة الأولية
    items: [],
    totalPriceExVAT: 0,
    totalVatAmount: 0,
    totalAmount: 0,

    // الإجراءات
    addItem: (product, quantity = 1) => {
        set(state => {
            const existingItem = state.items.find(i => i.productId === product.id);

            // 💡 الحساب التفصيلي للسعر الأساسي وقيمة الضريبة لعنصر واحد (Ex-VAT Logic)
            const price = product.price; // السعر الشامل
            const basePrice = price / (1 + VAT_RATE); // السعر قبل الضريبة
            const itemVatAmount = price - basePrice; // قيمة الضريبة

            let newItems;
            if (existingItem) {
                // إذا كان المنتج موجوداً، قم بزيادة الكمية
                newItems = state.items.map(i =>
                    i.productId === product.id
                        ? { ...i, quantity: i.quantity + quantity }
                        : i
                );
            } else {
                // إذا كان منتجاً جديداً، قم بإضافته
                const newItem: CartItem = {
                    id: product.id,
                    productId: product.id,
                    name: product.name,
                    price: price, // السعر الشامل
                    quantity: quantity,
                    basePrice: parseFloat(basePrice.toFixed(2)), // تسجيل السعر قبل الضريبة
                    itemVatAmount: parseFloat(itemVatAmount.toFixed(2)), // تسجيل قيمة الضريبة
                };
                newItems = [newItem, ...state.items];
            }
            
            // حساب الإجماليات وتحديث الحالة
            return {
                items: newItems,
                ...calculateTotals(newItems),
            };
        });
    },

    removeItem: (itemId) => {
        set(state => {
            const newItems = state.items.filter(i => i.id !== itemId);
            return {
                items: newItems,
                ...calculateTotals(newItems),
            };
        });
    },

    updateQuantity: (itemId, newQuantity) => {
        if (newQuantity <= 0) {
            get().removeItem(itemId);
            return;
        }

        set(state => {
            const newItems = state.items.map(i =>
                i.id === itemId
                    ? { ...i, quantity: newQuantity }
                    : i
            );
            return {
                items: newItems,
                ...calculateTotals(newItems),
            };
        });
    },
    
    clearCart: () => set({ 
        items: [], 
        totalPriceExVAT: 0, 
        totalVatAmount: 0, 
        totalAmount: 0 
    }),
    
    // دالة مساعدة لحساب رسوم الدفع لتظهر للبائع (بدون إضافتها لإجمالي العميل)
    getFees: (paymentMethod) => {
        const { totalPriceExVAT } = get();
        // رسوم الدفع تُحسب عادةً على أساس المبلغ قبل الضريبة أو المبلغ الإجمالي
        // سنستخدم المبلغ الإجمالي قبل الضريبة (totalPriceExVAT) هنا لضمان دقة التقارير.
        return parseFloat((totalPriceExVAT * FEES[paymentMethod]).toFixed(2));
    },
}));