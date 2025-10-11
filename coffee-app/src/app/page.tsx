import { redirect } from 'next/navigation';

// هذه الصفحة هي الصفحة الرئيسية (الروت /)
export default function HomePage() {
  // بما أن المستخدمين يجب أن يسجلوا الدخول أولاً، نوجههم مباشرة إلى صفحة الدخول
  redirect('/login');
}