'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePageTitleStore } from '@/store/usePageTitleStore';

const pageConfigs: Record<string, { title: string; breadcrumbs: string[] }> = {
  '/dashboard': { title: 'Dashboard', breadcrumbs: ['Home', 'Dashboard'] },
  '/budget-plans': { title: 'Budget Plans', breadcrumbs: ['Home', 'Budget Plans'] },
  '/budget-plans/new': { title: 'Create Budget Plan', breadcrumbs: ['Home', 'Budget Plans', 'New'] },
  '/budget-requests': { title: 'Budget Requests', breadcrumbs: ['Home', 'Budget Requests'] },
  '/budget-requests/new': { title: 'Create Budget Request', breadcrumbs: ['Home', 'Budget Requests', 'New'] },
  '/payment-requests': { title: 'Payment Requests', breadcrumbs: ['Home', 'Payment Requests'] },
  '/payment-requests/new': { title: 'Create Payment Request', breadcrumbs: ['Home', 'Payment Requests', 'New'] },
  '/reconciliation': { title: 'Reconciliation', breadcrumbs: ['Home', 'Reconciliation'] },
  '/reports': { title: 'Reports', breadcrumbs: ['Home', 'Reports'] },
  '/reports/reconciliation': { title: 'Reports — Reconciliation', breadcrumbs: ['Home', 'Reports', 'Reconciliation'] },
  '/reports/data-marts': { title: 'Reports — Data Marts', breadcrumbs: ['Home', 'Reports', 'Data Marts'] },
  '/budget-requests/[id]/edit': { title: 'Edit Budget Request', breadcrumbs: ['Home', 'Budget Requests', 'Edit'] },
  '/payment-requests/[id]/edit': { title: 'Edit Payment Request', breadcrumbs: ['Home', 'Payment Requests', 'Edit'] },
  '/notifications': { title: 'Notifications', breadcrumbs: ['Home', 'Notifications'] },
  '/settings': { title: 'Application Settings', breadcrumbs: ['Home', 'Application Settings'] },
  '/user-management': { title: 'User Management', breadcrumbs: ['Home', 'User Management'] },
  '/workspace-management': { title: 'Workspace Management', breadcrumbs: ['Home', 'Workspace Management'] },
  '/workspace-management/department': { title: 'Workspace Management', breadcrumbs: ['Home', 'Workspace Management', 'Department'] },
  '/workspace-management/role': { title: 'Workspace Management', breadcrumbs: ['Home', 'Workspace Management', 'Role'] },
  '/workspace-management/approval-schema': { title: 'Approval Schema Management', breadcrumbs: ['Home', 'Workspace Management', 'Approval Schema'] },
  '/workspace-management/approval-schema/new': { title: 'New Approval Schema', breadcrumbs: ['Home', 'Workspace Management', 'Approval Schema', 'New'] },
  '/workspace-management/department/new': { title: 'New Department', breadcrumbs: ['Home', 'Workspace Management', 'Department', 'New'] },
  '/workspace-management/role/new': { title: 'New Role', breadcrumbs: ['Home', 'Workspace Management', 'Role', 'New'] },
};

export function usePageTitle() {
  const pathname = usePathname();
  const setPage = usePageTitleStore((s) => s.setPage);

  useEffect(() => {
    const normalizedPath = pathname.replace(/\/[0-9a-fA-F-]+(?=\/|$)/g, '/[id]');
    let config = pageConfigs[normalizedPath];
    if (!config) {
      const parent = Object.keys(pageConfigs).find((p) => normalizedPath.startsWith(p));
      config = parent ? pageConfigs[parent] : { title: 'Dashboard', breadcrumbs: ['Home'] };
    }
    setPage(config.title, config.breadcrumbs);
  }, [pathname, setPage]);
}
