'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { IconBuilding, IconIdBadge2, IconSchema, IconHistory, IconBriefcase, IconCategory, IconHierarchy2 } from '@tabler/icons-react';

const subNavigation = [
  { name: 'Department', href: '/workspace-management/department', icon: IconBuilding },
  { name: 'Project', href: '/workspace-management/project', icon: IconBriefcase },
  { name: 'Category', href: '/workspace-management/category', icon: IconCategory },
  { name: 'Cost Center', href: '/workspace-management/cost-center', icon: IconHierarchy2 },
  { name: 'Role', href: '/workspace-management/role', icon: IconIdBadge2 },
  { name: 'Approval Schema', href: '/workspace-management/approval-schema', icon: IconSchema },
  { name: 'Activity History', href: '/workspace-management/activity-history', icon: IconHistory },
];

export default function WorkspaceManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      <div className="w-full lg:w-64 shrink-0 h-fit border-r border-gray-200 pr-4">
        <nav className="space-y-2">
          {subNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors',
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <item.icon className={cn('w-5 h-5', isActive && 'text-blue-600')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 w-full overflow-x-auto">{children}</div>
    </div>
  );
}
