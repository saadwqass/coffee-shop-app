import { create } from 'zustand';

// ---------------------------------------------------------------------
// 1. تحديد أنواع البيانات
// ---------------------------------------------------------------------

// نفترض أن هيكل بيانات المستخدم هكذا
interface User {
    userId: string;
    email: string;
    name: string;
    role: 'admin' | 'seller';
    // ID المناوبة الحالية (مطلوب لربط عملية البيع بها)
    shiftId: string | null; 
}

interface UserState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    // ... (دوال المصادقة)
    
    // 💡 الدوال المطلوبة
    setUser: (user: User) => void;
    setToken: (token: string) => void;
    clearAuth: () => void;
    // دالة لتسجيل المناوبة (إذا كنت تستخدمها)
    startShift: (shiftId: string) => void; 
}

// ---------------------------------------------------------------------
// 2. إنشاء مخزن المستخدم (Zustand Store)
// ---------------------------------------------------------------------

export const useUserStore = create<UserState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    
    setUser: (user) => set({ user, isAuthenticated: true }),
    setToken: (token) => set({ token }),
    clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
    startShift: (shiftId) => set(state => ({
        // تحديث الـ user بإضافة shiftId
        user: state.user ? { ...state.user, shiftId } : null
    })),
}));
