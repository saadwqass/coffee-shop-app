import { create } from 'zustand';
import { fetchData } from '@/lib/api'; // 🌐 افتراض وجود هذه الدالة للاتصال بالـ API
// 💡 يجب استيراد CartItem من مخزن العربة لاستخدامها في دالة decreaseStockLocally
import { CartItem } from './cartStore'; 

// ---------------------------------------------------------------------
// 1. تحديد أنواع البيانات (يتطابق مع نموذج Prisma)
// ---------------------------------------------------------------------

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number; // السعر الشامل للضريبة
  imageUrl: string | null;
  stock: number;
  isAvailable: boolean;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
}

export interface ProductPayload {
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    stock: number;
    isAvailable: boolean;
    categoryId: string;
}

// ---------------------------------------------------------------------
// 2. تحديد واجهة حالة المخزن
// ---------------------------------------------------------------------

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  
  // الإجراءات الأساسية
  setProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // تحديثات الحالة المحلية (CRUD)
  addProductLocally: (product: Product) => void;
  updateProductLocally: (id: string, updatedProduct: Product) => void;
  deleteProductLocally: (id: string) => void;

  // 🏆 الإجراءات المفقودة
  fetchProducts: () => Promise<void>;
  decreaseStockLocally: (items: CartItem[]) => void;
  
  // 🆕 الدالة المضافة: مزامنة مخزون منتج معين
  syncProductStock: (productId: string, newStock: number) => void;
}

// ---------------------------------------------------------------------
// 3. إنشاء المخزن باستخدام Zustand مع الدوال المضافة
// ---------------------------------------------------------------------

export const useProductStore = create<ProductState>((set, get) => ({
  // الحالة الأولية
  products: [],
  loading: false,
  error: null,

  // الإجراءات الأساسية
  setProducts: (products) => set({ products, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  // تحديثات الحالة المحلية (CRUD)
  addProductLocally: (product) => set((state) => ({ 
    products: [product, ...state.products] 
  })),
  
  updateProductLocally: (id, updatedProduct) => set((state) => ({
    products: state.products.map(p => 
      p.id === id ? updatedProduct : p
    )
  })),

  deleteProductLocally: (id) => set((state) => ({
    products: state.products.filter(p => p.id !== id)
  })),

  // 🏆 1. دالة جلب المنتجات (تستخدم في POS و Admin)
  fetchProducts: async () => {
    get().setLoading(true);
    try {
      // نستخدم مسار /api/products العام (يفترض وجوده) أو /api/admin/products
      const productsData: Product[] = await fetchData('/api/admin/products'); 
      set({ products: productsData, loading: false, error: null });
    } catch (err: any) {
      set({ error: err.message || 'فشل تحميل المنتجات.', loading: false, products: [] });
    }
  },
  
  // 🏆 2. دالة تحديث المخزون محلياً بعد البيع (تستخدم في POS)
  decreaseStockLocally: (items) => {
    set(state => {
      const updatedProducts = state.products.map(product => {
        const soldItem = items.find(item => item.productId === product.id);
        if (soldItem) {
          const newStock = product.stock - soldItem.quantity;
          // التأكد من أن المخزون لا ينزل تحت الصفر
          return { ...product, stock: Math.max(0, newStock) };
        }
        return product;
      });
      return { products: updatedProducts };
    });
  },

  // 🆕 3. دالة مزامنة مخزون منتج معين
  syncProductStock: (productId: string, newStock: number) => {
    set(state => ({
      products: state.products.map(p => 
        p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p
      )
    }));
  }
}));