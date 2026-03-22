'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  usePageTitle();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden">
        <Header />
        <main className={cn('flex-1 min-h-screen p-6 pt-24 bg-white w-full transition-all duration-300')}>
          {children}
        </main>
      </div>
    </div>
  );
}
