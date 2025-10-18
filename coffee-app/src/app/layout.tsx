import './globals.css';
// 🏆 استيراد الخط العربي (Cairo) واللاتيني (Inter)
import { Inter, Cairo } from 'next/font/google'; 

import ClientProviders from '@/components/ClientProviders';

const inter = Inter({ 
    subsets: ['latin'],
    variable: '--font-inter', // 🏆 تعريف متغير CSS للخط اللاتيني
});

const cairo = Cairo({ 
    subsets: ['arabic'],
    variable: '--font-cairo', // 🏆 تعريف متغير CSS للخط العربي
});

export const metadata = {
    title: 'Coffee Shop POS',
    description: 'Point of Sale application for a modern coffee shop.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // 🏆 تطبيق متغيرات الخطوط على عنصر HTML
        <html lang="ar" dir="rtl" className={`${cairo.variable} ${inter.variable}`}>
            {/* 🏆 استخدام 'font-sans' لربط خط Cairo الافتراضي (سنضيفه في Tailwind Config) */}
            <body className="font-sans antialiased"> 
                <ClientProviders> 
                    {children}
                </ClientProviders>
            </body>
        </html>
    );
}