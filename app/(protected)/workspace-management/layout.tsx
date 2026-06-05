'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { IconBuilding, IconIdBadge2, IconSchema, IconHistory, IconBriefcase, IconCategory, IconHierarchy2, IconTag, IconMapPin } from '@tabler/icons-react';
import { MenuAccess } from '@/types/access-control';

const restrictedMenuAccess: MenuAccess = {
  dashboard: false,
  budgetPlans: false,
  budgetRequests: false,
  paymentRequests: false,
  reconciliation: false,
  reports: false,
  userManagement: false,
  workspaceManagement: false,
  viewDepartment: false,
  viewOriginOffice: false,
  viewProject: false,
  viewCategory: false,
  viewCategoryKeyIndex: false,
  viewCostCenter: false,
  viewRole: false,
  viewApprovalSchema: false,
  viewActivityHistory: false,
  viewBudgetPlanRealization: false,
};

export default function WorkspaceManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const menuAccess = (session?.user as { access?: { menuAccess?: MenuAccess } })?.access?.menuAccess ?? restrictedMenuAccess;

  const subNavigation = [
    { name: 'Department', href: '/workspace-management/department', icon: IconBuilding, show: menuAccess.viewDepartment },
    { name: 'Origin Office', href: '/workspace-management/origin-office', icon: IconMapPin, show: menuAccess.viewOriginOffice },
    { name: 'Project', href: '/workspace-management/project', icon: IconBriefcase, show: menuAccess.viewProject },
    { name: 'Category', href: '/workspace-management/category', icon: IconCategory, show: menuAccess.viewCategory },
    { name: 'Category Key Index', href: '/workspace-management/category-key-index', icon: IconTag, show: menuAccess.viewCategoryKeyIndex },
    { name: 'Cost Center', href: '/workspace-management/cost-center', icon: IconHierarchy2, show: menuAccess.viewCostCenter },
    { name: 'Role', href: '/workspace-management/role', icon: IconIdBadge2, show: menuAccess.viewRole },
    { name: 'Approval Schema', href: '/workspace-management/approval-schema', icon: IconSchema, show: menuAccess.viewApprovalSchema },
    { name: 'Activity History', href: '/workspace-management/activity-history', icon: IconHistory, show: menuAccess.viewActivityHistory },
  ].filter((item) => menuAccess.workspaceManagement && item.show);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      <div className="w-full lg:w-64 shrink-0 h-fit self-start border-r border-gray-200 pr-4 lg:sticky lg:top-24">
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
