'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  IconBuilding,
  IconIdBadge2,
  IconSchema,
  IconHistory,
  IconBriefcase,
  IconCategory,
  IconHierarchy2,
  IconTag,
  IconMapPin,
  IconReceipt2,
  IconSitemap,
} from '@tabler/icons-react';
import { MenuAccess } from '@/types/access-control';
import { restrictedMenuAccess } from '@/lib/default-access';

export default function WorkspaceManagementShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const menuAccess =
    (session?.user as { access?: { menuAccess?: MenuAccess } })?.access?.menuAccess ??
    restrictedMenuAccess;

  const subNavigation = [
    { name: 'Division', href: '/workspace-management/division', icon: IconSitemap, show: menuAccess.viewDivision },
    { name: 'Department', href: '/workspace-management/department', icon: IconBuilding, show: menuAccess.viewDepartment },
    { name: 'Origin Office', href: '/workspace-management/origin-office', icon: IconMapPin, show: menuAccess.viewOriginOffice },
    { name: 'Project', href: '/workspace-management/project', icon: IconBriefcase, show: menuAccess.viewProject },
    { name: 'Category', href: '/workspace-management/category', icon: IconCategory, show: menuAccess.viewCategory },
    {
      name: 'Category Key Index',
      href: '/workspace-management/category-key-index',
      icon: IconTag,
      show: menuAccess.viewCategoryKeyIndex,
    },
    { name: 'Cost Center', href: '/workspace-management/cost-center', icon: IconHierarchy2, show: menuAccess.viewCostCenter },
    { name: 'COA', href: '/workspace-management/coa', icon: IconReceipt2, show: menuAccess.viewCoa },
    { name: 'Role', href: '/workspace-management/role', icon: IconIdBadge2, show: menuAccess.viewRole },
    {
      name: 'Approval Schema',
      href: '/workspace-management/approval-schema',
      icon: IconSchema,
      show: menuAccess.viewApprovalSchema,
    },
    {
      name: 'Activity History',
      href: '/workspace-management/activity-history',
      icon: IconHistory,
      show: menuAccess.viewActivityHistory,
    },
  ].filter((item) => menuAccess.workspaceManagement && item.show);

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
