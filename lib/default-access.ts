import { MenuAccess, ActivityAccess } from '@/types/access-control';

export const defaultMenuAccess: MenuAccess = {
  dashboard: true,
  budgetPlans: true,
  budgetRequests: true,
  paymentRequests: true,
  reconciliation: true,
  reports: true,
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
  // Sensitive financial column — opt-in. Admin & users explicitly granted only.
  viewBudgetPlanRealization: false,
};

/**
 * Lock-everything fallback used by client layouts when the session has no
 * `access.menuAccess` payload yet (e.g. before NextAuth resolves on first
 * paint, or for unauthenticated edge cases).
 *
 * Single source of truth — adding a new field to `MenuAccess` will produce a
 * compile error here and the consumers (`Sidebar`, layout files) will keep
 * working without changes. Derived from the `MenuAccess` shape so we never
 * forget a key.
 */
export const restrictedMenuAccess: MenuAccess = {
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

export const defaultActivityAccess: ActivityAccess = {
  createBudgetPlan: false,
  editBudgetPlan: false,
  deleteBudgetPlan: false,
  createBudgetRequest: false,
  editBudgetRequest: false,
  deleteBudgetRequest: false,
  createPaymentRequest: false,
  editPaymentRequest: false,
  deletePaymentRequest: false,
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
  // Changing other users' access permissions is highly privileged — opt-in
  // only. Admin role bypasses this check via fullActivityAccess.
  changeAccess: false,
  runReconciliationSync: false,
  editReconciliationMapping: false,
  saveReconciliationResult: false,
  // Cross-department creation is opt-in. By default users can only create
  // BP/BR/PR for their own department; admin / explicitly-granted users only.
  createForOtherDepartment: false,
  // Cross-department visibility is opt-in. By default users only see
  // BP/BR/PR rows from their own department in list pages and dropdowns.
  viewOtherDepartmentDocuments: false,
  // Editing the Classification section (Cost Center / Category / CKI / COA /
  // OPEX type & allocation) on review pages is opt-in. Reviewers can still
  // approve/decline; the classification fields render read-only unless this
  // permission is granted. Admin role gets it via fullActivityAccess.
  editClassificationSection: false,
};

/** Full access for admin role - used when user has ADMIN roleCode */
export const fullMenuAccess: MenuAccess = {
  dashboard: true,
  budgetPlans: true,
  budgetRequests: true,
  paymentRequests: true,
  reconciliation: true,
  reports: true,
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
  viewBudgetPlanRealization: true,
};

export const fullActivityAccess: ActivityAccess = {
  createBudgetPlan: true,
  editBudgetPlan: true,
  deleteBudgetPlan: true,
  createBudgetRequest: true,
  editBudgetRequest: true,
  deleteBudgetRequest: true,
  createPaymentRequest: true,
  editPaymentRequest: true,
  deletePaymentRequest: true,
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
  changeAccess: true,
  runReconciliationSync: true,
  editReconciliationMapping: true,
  saveReconciliationResult: true,
  createForOtherDepartment: true,
  viewOtherDepartmentDocuments: true,
  editClassificationSection: true,
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
