'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { IconDatabase, IconScale, IconTable } from '@tabler/icons-react';
import { MenuAccess } from '@/types/access-control';
import { restrictedMenuAccess } from '@/lib/default-access';

export default function ReportsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const menuAccess =
    (session?.user as { access?: { menuAccess?: MenuAccess } })?.access?.menuAccess ??
    restrictedMenuAccess;

  const subNavigation = [
    { name: 'Reconciliation', href: '/reports/reconciliation', icon: IconScale, show: menuAccess.reports },
    { name: 'Data Marts', href: '/reports/data-marts', icon: IconDatabase, show: menuAccess.reports },
    { name: 'Budget Pivot', href: '/reports/budget-pivot', icon: IconTable, show: menuAccess.reports },
  ].filter((item) => item.show);

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row">
      <div className="h-fit w-full shrink-0 self-start border-r border-gray-200 pr-4 lg:sticky lg:top-24 lg:w-64">
        <nav className="space-y-2">
          {subNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition-colors',
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-blue-600')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="w-full flex-1 overflow-x-auto">{children}</div>
    </div>
  );
}
