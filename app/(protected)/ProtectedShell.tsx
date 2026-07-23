'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function ProtectedShell({ children }: { children: React.ReactNode }) {
  usePageTitle();

  return (
    <div className="flex h-screen print:block print:h-auto">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 overflow-x-hidden print:overflow-visible">
        <div className="print:hidden">
          <Header />
        </div>
        <main
          className={cn(
            'flex-1 min-h-screen p-6 pt-24 bg-white w-full transition-all duration-300',
            'print:p-0 print:pt-0 print:min-h-0',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
