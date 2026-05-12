'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/store/useSidebarStore';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import {
  IconBriefcaseFilled,
  IconChartBar,
  IconCoins,
  IconId,
  IconLayoutDashboardFilled,
  IconLogout,
  IconReceipt,
  IconScale,
  IconSettings,
  IconSubtask,
} from '@tabler/icons-react';
import Logo from '@/public/workxpace-logo.svg';
import FullLogo from '@/public/workxpace-full-logo.svg';
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
};

const Sidebar = () => {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const { data: session, status } = useSession();

  const menuAccess = (session?.user as { access?: { menuAccess?: MenuAccess } })?.access?.menuAccess ?? restrictedMenuAccess;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: IconLayoutDashboardFilled, show: menuAccess.dashboard },
    { name: 'Budget Plans', href: '/budget-plans', icon: IconCoins, show: menuAccess.budgetPlans },
    { name: 'Budget Requests', href: '/budget-requests', icon: IconBriefcaseFilled, show: menuAccess.budgetRequests },
    { name: 'Payment Requests', href: '/payment-requests', icon: IconReceipt, show: menuAccess.paymentRequests },
    { name: 'Reconciliation', href: '/reconciliation', icon: IconScale, show: menuAccess.reconciliation },
    { name: 'Reports', href: '/reports', icon: IconChartBar, show: menuAccess.reports },
    { name: 'User Management', href: '/user-management', icon: IconId, show: menuAccess.userManagement },
    { name: 'Workspace Management', href: '/workspace-management', icon: IconSubtask, show: menuAccess.workspaceManagement },
    // { name: 'Application Settings', href: '/settings', icon: IconSettings, show: menuAccess.settings ?? menuAccess.workspaceManagement },
  ].filter((i) => i.show);

  if (status === 'loading') {
    return (
      <aside className={cn('relative left-0 top-0 h-screen bg-white border-r', isCollapsed ? 'w-16' : 'w-64')}>
        <div className="py-4 space-y-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-11 mx-4 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'relative left-0 top-0 h-screen bg-white border-r border-gray-200 overflow-hidden transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="h-16 flex items-center shrink-0">
        <button onClick={toggleSidebar} className="w-full h-full flex items-center px-2 cursor-pointer">
          <div className="w-full h-auto flex-shrink-0 flex items-center justify-center">
            <Image src={isCollapsed ? Logo : FullLogo} alt="Workxpace Logo" width={180} height={40} />
          </div>
          <span
            className={cn(
              'ml-3 font-semibold text-xl transition-all duration-300 flex-shrink-0 text-blue-600',
              isCollapsed ? 'opacity-0 -translate-x-10 overflow-hidden w-0' : 'opacity-100'
            )}
          >
            Workxpace
          </span>
        </button>
      </div>

      <nav className="py-4 flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || (pathname.startsWith(item.href) && pathname.charAt(item.href.length) === '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'min-h-12 flex items-center w-full transition-colors px-4 group',
                isCollapsed ? 'h-12' : 'h-auto',
                isActive ? 'text-blue-600' : 'text-gray-700'
              )}
            >
              <div className={
                cn(
                  'w-8 h-8 flex items-center justify-center flex-shrink-0 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-all duration-300 shadow-sm',
                  isActive ? 'bg-blue-50' : 'bg-gray-100'
                )
              }>
                <item.icon className={cn('w-5 h-5 group-hover:text-blue-600 transition-all duration-300', isActive && 'text-blue-600')} />
              </div>
              <span
                className={cn(
                  'ml-3 transition-all duration-300 leading-tight group-hover:text-blue-600',
                  isCollapsed ? 'opacity-0 -translate-x-10 overflow-hidden w-0' : 'opacity-100'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-2">
        <Link
          href="/login"
          className={cn(
            'min-h-11 flex items-center w-full transition-colors py-3 rounded-lg text-gray-600 group',
            isCollapsed ? 'h-11' : ''
          )}
        >
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-all duration-300 shadow-sm">
            <IconLogout className="w-5 h-5 flex-shrink-0 group-hover:text-blue-600 transition-all duration-300" />
          </div>
          <span className={cn('ml-3 transition-all duration-300 leading-tight group-hover:text-blue-600', isCollapsed && 'hidden')}>Logout</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
