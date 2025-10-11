import { create } from 'zustand';

// ---------------------------------------------------------------------
// 1. تعريف النوع الأساسي للصنف (يتطابق مع نموذج Prisma)
// ---------------------------------------------------------------------

export interface Category {
    id: string;
    name: string;
}

// ---------------------------------------------------------------------
// 2. تعريف النوع لحالة المخزن (State) والإجراءات (Actions)
// ---------------------------------------------------------------------

interface CategoryState {
    categories: Category[];
    loading: boolean;
    error: string | null;
    
    // الإجراءات
    setCategories: (categories: Category[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    
    addCategoryLocally: (category: Category) => void;
    updateCategoryLocally: (id: string, name: string) => void;
    deleteCategoryLocally: (id: string) => void;
    
    // 🏆 دالة جلب الأصناف (للاستخدام المتكرر)
    fetchCategories: () => Promise<void>; 
}

// ---------------------------------------------------------------------
// 3. إنشاء المخزن (مع إضافة منطق الجلب من API)
// ---------------------------------------------------------------------

// 💡 يجب علينا استيراد fetchData من lib/api لاستخدامها هنا
import { fetchData } from '@/lib/api'; 

export const useCategoryStore = create<CategoryState>((set, get) => ({
    // الحالة الأولية
    categories: [],
    loading: false,
    error: null,

    // الإجراءات
    setCategories: (categories) => set({ categories, loading: false }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    addCategoryLocally: (category) => set((state) => ({ 
        categories: [category, ...state.categories] 
    })),
    
    updateCategoryLocally: (id, newName) => set((state) => ({
        categories: state.categories.map(c => 
            c.id === id ? { ...c, name: newName } : c
        )
    })),

    deleteCategoryLocally: (id) => set((state) => ({
        categories: state.categories.filter(c => c.id !== id)
    })),
    
    // 🏆 منطق جلب الأصناف من الـ API
    fetchCategories: async () => {
        const { categories, loading } = get();
        // منع الجلب المتكرر إذا كانت البيانات موجودة وغير في حالة تحميل
        if (loading || categories.length > 0) return; 

        set({ loading: true, error: null });
        try {
            const data: Category[] = await fetchData('/api/admin/categories'); 
            set({ categories: data, error: null });
        } catch (err: any) {
            console.error('Failed to fetch categories:', err);
            set({ error: err.message || 'فشل تحميل الأصناف.', categories: [] });
        } finally {
            set({ loading: false });
        }
    },
}));