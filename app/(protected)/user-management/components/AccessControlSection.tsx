'use client';

import { ActivityAccess, MenuAccess } from '@/types/access-control';

interface AccessControlSectionProps {
  title: string;
  items: Array<{ key: string; label: string }>;
  access: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
  columns?: number;
}

function GridColumns({ columns = 1 }: { columns?: number }) {
  if (columns === 3) return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3';
  if (columns === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-3';
  return 'grid grid-cols-1 gap-3';
}

export default function AccessControlSection({ title, items, access, onChange, columns }: AccessControlSectionProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className={GridColumns({ columns })}>
        {items.map((item) => (
          <label
            key={item.key}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={Boolean(access[item.key])}
              onChange={(e) => onChange(item.key, e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export const menuAccessItems: Array<{ key: keyof MenuAccess; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'budgetPlans', label: 'Budget Plans' },
  { key: 'budgetRequests', label: 'Budget Requests' },
  { key: 'userManagement', label: 'User Management' },
  { key: 'workspaceManagement', label: 'Workspace Management' },
];

export const activityAccessItems: Array<{ key: keyof ActivityAccess; label: string }> = [
  { key: 'createBudgetPlan', label: 'Create Budget Plan' },
  { key: 'editBudgetPlan', label: 'Edit Budget Plan' },
  { key: 'deleteBudgetPlan', label: 'Delete Budget Plan' },
  { key: 'createBudgetRequest', label: 'Create Budget Request' },
  { key: 'editBudgetRequest', label: 'Edit Budget Request' },
  { key: 'deleteBudgetRequest', label: 'Delete Budget Request' },
  { key: 'createDepartment', label: 'Create Department' },
  { key: 'editDepartment', label: 'Edit Department' },
  { key: 'deleteDepartment', label: 'Delete Department' },
  { key: 'createProject', label: 'Create Project' },
  { key: 'editProject', label: 'Edit Project' },
  { key: 'deleteProject', label: 'Delete Project' },
  { key: 'createRole', label: 'Create Role' },
  { key: 'editRole', label: 'Edit Role' },
  { key: 'deleteRole', label: 'Delete Role' },
  { key: 'createApprovalSchema', label: 'Create Approval Schema' },
  { key: 'editApprovalSchema', label: 'Edit Approval Schema' },
  { key: 'deleteApprovalSchema', label: 'Delete Approval Schema' },
  { key: 'createUser', label: 'Create User' },
  { key: 'editUser', label: 'Edit User' },
  { key: 'deleteUser', label: 'Delete User' },
];
