import { MenuAccess, ActivityAccess } from '@/types/access-control';

export const defaultMenuAccess: MenuAccess = {
  dashboard: true,
  budgetPlans: true,
  budgetRequests: true,
  reconciliation: true,
  userManagement: true,
  workspaceManagement: true,
  viewDepartment: true,
  viewOriginOffice: true,
  viewProject: true,
  viewCategory: true,
  viewCategoryKeyIndex: true,
  viewCostCenter: true,
  viewRole: true,
  viewApprovalSchema: true,
  viewActivityHistory: true,
};

export const defaultActivityAccess: ActivityAccess = {
  createBudgetPlan: false,
  editBudgetPlan: false,
  deleteBudgetPlan: false,
  createBudgetRequest: false,
  editBudgetRequest: false,
  deleteBudgetRequest: false,
  createDepartment: false,
  editDepartment: false,
  deleteDepartment: false,
  createOriginOffice: false,
  editOriginOffice: false,
  deleteOriginOffice: false,
  createProject: false,
  editProject: false,
  deleteProject: false,
  createRole: false,
  editRole: false,
  deleteRole: false,
  createApprovalSchema: false,
  editApprovalSchema: false,
  deleteApprovalSchema: false,
  createCategory: false,
  editCategory: false,
  deleteCategory: false,
  createCategoryKeyIndex: false,
  editCategoryKeyIndex: false,
  deleteCategoryKeyIndex: false,
  createCostCenter: false,
  editCostCenter: false,
  deleteCostCenter: false,
  createUser: false,
  editUser: false,
  deleteUser: false,
  runReconciliationSync: false,
  editReconciliationMapping: false,
};

/** Full access for admin role - used when user has ADMIN roleCode */
export const fullMenuAccess: MenuAccess = {
  dashboard: true,
  budgetPlans: true,
  budgetRequests: true,
  reconciliation: true,
  userManagement: true,
  workspaceManagement: true,
  viewDepartment: true,
  viewOriginOffice: true,
  viewProject: true,
  viewCategory: true,
  viewCategoryKeyIndex: true,
  viewCostCenter: true,
  viewRole: true,
  viewApprovalSchema: true,
  viewActivityHistory: true,
};

export const fullActivityAccess: ActivityAccess = {
  createBudgetPlan: true,
  editBudgetPlan: true,
  deleteBudgetPlan: true,
  createBudgetRequest: true,
  editBudgetRequest: true,
  deleteBudgetRequest: true,
  createDepartment: true,
  editDepartment: true,
  deleteDepartment: true,
  createOriginOffice: true,
  editOriginOffice: true,
  deleteOriginOffice: true,
  createProject: true,
  editProject: true,
  deleteProject: true,
  createRole: true,
  editRole: true,
  deleteRole: true,
  createApprovalSchema: true,
  editApprovalSchema: true,
  deleteApprovalSchema: true,
  createCategory: true,
  editCategory: true,
  deleteCategory: true,
  createCategoryKeyIndex: true,
  editCategoryKeyIndex: true,
  deleteCategoryKeyIndex: true,
  createCostCenter: true,
  editCostCenter: true,
  deleteCostCenter: true,
  createUser: true,
  editUser: true,
  deleteUser: true,
  runReconciliationSync: true,
  editReconciliationMapping: true,
};

/** Mengisi field akses baru untuk JSON lama yang disimpan di DB. */
export function mergeWithDefaultMenuAccess(stored: unknown): MenuAccess {
  const partial =
    stored && typeof stored === 'object' && !Array.isArray(stored)
      ? (stored as Partial<MenuAccess>)
      : {};
  return { ...defaultMenuAccess, ...partial };
}

export function mergeWithDefaultActivityAccess(stored: unknown): ActivityAccess {
  const partial =
    stored && typeof stored === 'object' && !Array.isArray(stored)
      ? (stored as Partial<ActivityAccess>)
      : {};
  return { ...defaultActivityAccess, ...partial };
}
