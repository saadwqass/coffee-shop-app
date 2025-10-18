'use client'; // ⬅️ هذا السطر ضروري جداً

import { AuthProvider } from '@/context/AuthContext';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}