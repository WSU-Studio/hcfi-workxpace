'use client';

import { ActivityAccess, MenuAccess } from '@/types/access-control';

interface AccessControlSectionProps {
  title: string;
  items: Array<{ key: string; label: string }>;
  /** Checkbox state; indexed by `items[].key` */
  access: MenuAccess | ActivityAccess;
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
              checked={Boolean((access as unknown as Record<string, boolean>)[item.key])}
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

export const menuAccessItems: Array<{ key: string; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'budgetPlans', label: 'Budget Plans' },
  { key: 'budgetRequests', label: 'Budget Requests' },
  { key: 'paymentRequests', label: 'Payment Requests' },
  { key: 'reconciliation', label: 'Reconciliation' },
  { key: 'reports', label: 'Reports' },
  { key: 'userManagement', label: 'User Management' },
  { key: 'workspaceManagement', label: 'Workspace Management' },
  { key: 'viewDepartment', label: 'View Department Page' },
  { key: 'viewOriginOffice', label: 'View Origin Office Page' },
  { key: 'viewProject', label: 'View Project Page' },
  { key: 'viewCategory', label: 'View Category Page' },
  { key: 'viewCategoryKeyIndex', label: 'View Category Key Index Page' },
  { key: 'viewCostCenter', label: 'View Cost Center Page' },
  { key: 'viewCoa', label: 'View COA Page' },
  { key: 'viewRole', label: 'View Role Page' },
  { key: 'viewApprovalSchema', label: 'View Approval Schema Page' },
  { key: 'viewActivityHistory', label: 'View Activity History Page' },
];

export const activityAccessItems: Array<{ key: string; label: string }> = [
  { key: 'createBudgetPlan', label: 'Create Budget Plan' },
  { key: 'editBudgetPlan', label: 'Edit Budget Plan' },
  { key: 'deleteBudgetPlan', label: 'Delete Budget Plan' },
  { key: 'createBudgetRequest', label: 'Create Budget Request' },
  { key: 'editBudgetRequest', label: 'Edit Budget Request' },
  { key: 'deleteBudgetRequest', label: 'Delete Budget Request' },
  { key: 'createPaymentRequest', label: 'Create Payment Request' },
  { key: 'editPaymentRequest', label: 'Edit Payment Request' },
  { key: 'deletePaymentRequest', label: 'Delete Payment Request' },
  { key: 'runReconciliationSync', label: 'Run Reconciliation / Confins Sync' },
  { key: 'editReconciliationMapping', label: 'Manual Reconciliation / Override Mapping' },
  { key: 'saveReconciliationResult', label: 'Save Reconciliation Results' },
  { key: 'createUser', label: 'Create User' },
  { key: 'editUser', label: 'Edit User' },
  { key: 'deleteUser', label: 'Delete User' },
  { key: 'changeAccess', label: 'Change Access' },
  { key: 'createForOtherDepartment', label: 'Create BP/BR/PR for Other Departments (Cross-Department)' },
  { key: 'viewOtherDepartmentDocuments', label: 'View BP/BR/PR from Other Departments (Cross-Department)' },
  { key: 'editClassificationSection', label: 'Edit Classification Section on BR/BP/PR' },
  { key: 'viewBudgetPlanRealization', label: 'View Budget Plan Realization (Realization & Outstanding columns)' },
  { key: 'viewBudgetPlanSnapshotOnBudgetRequestReview', label: 'View BP Snapshot & Outstanding Budget on Budget Request Review' },
];

export const workspaceManagementAccessItems: Array<{ key: string; label: string }> = [
  { key: 'createDepartment', label: 'Department: Create' },
  { key: 'editDepartment', label: 'Department: Edit' },
  { key: 'deleteDepartment', label: 'Department: Delete' },
  { key: 'createOriginOffice', label: 'Origin Office: Create' },
  { key: 'editOriginOffice', label: 'Origin Office: Edit' },
  { key: 'deleteOriginOffice', label: 'Origin Office: Delete' },
  { key: 'createProject', label: 'Project: Create' },
  { key: 'editProject', label: 'Project: Edit' },
  { key: 'deleteProject', label: 'Project: Delete' },
  { key: 'createRole', label: 'Role: Create' },
  { key: 'editRole', label: 'Role: Edit' },
  { key: 'deleteRole', label: 'Role: Delete' },
  { key: 'createApprovalSchema', label: 'Approval Schema: Create' },
  { key: 'editApprovalSchema', label: 'Approval Schema: Edit' },
  { key: 'deleteApprovalSchema', label: 'Approval Schema: Delete' },
  { key: 'createCategory', label: 'Category: Create' },
  { key: 'editCategory', label: 'Category: Edit' },
  { key: 'deleteCategory', label: 'Category: Delete' },
  { key: 'createCategoryKeyIndex', label: 'Category Key Index: Create' },
  { key: 'editCategoryKeyIndex', label: 'Category Key Index: Edit' },
  { key: 'deleteCategoryKeyIndex', label: 'Category Key Index: Delete' },
  { key: 'createCostCenter', label: 'Cost Center: Create' },
  { key: 'editCostCenter', label: 'Cost Center: Edit' },
  { key: 'deleteCostCenter', label: 'Cost Center: Delete' },
  { key: 'createCoa', label: 'COA: Create' },
  { key: 'editCoa', label: 'COA: Edit' },
  { key: 'deleteCoa', label: 'COA: Delete' },
];
