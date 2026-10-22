import { MenuAccess, ActivityAccess, parseDashboardView } from '@/types/access-control';

export const defaultMenuAccess: MenuAccess = {
  dashboard: true,
  budgetPlans: true,
  budgetRequests: true,
  paymentRequests: true,
  reconciliation: true,
  reports: true,
  userManagement: true,
  workspaceManagement: true,
  viewDivision: true,
  viewDepartment: true,
  viewOriginOffice: true,
  viewProject: true,
  viewCategory: true,
  viewCategoryKeyIndex: true,
  viewCostCenter: true,
  viewOpexAllocation: true,
  viewCoa: true,
  viewRole: true,
  viewApprovalSchema: true,
  viewActivityHistory: true,
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
  viewDivision: false,
  viewDepartment: false,
  viewOriginOffice: false,
  viewProject: false,
  viewCategory: false,
  viewCategoryKeyIndex: false,
  viewCostCenter: false,
  viewOpexAllocation: false,
  viewCoa: false,
  viewRole: false,
  viewApprovalSchema: false,
  viewActivityHistory: false,
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
  createDivision: false,
  editDivision: false,
  deleteDivision: false,
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
  createOpexAllocation: false,
  editOpexAllocation: false,
  deleteOpexAllocation: false,
  createCoa: false,
  editCoa: false,
  deleteCoa: false,
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
  // Financial snapshot (Plan total / Realized / Outstanding) on BR review page
  // is sensitive and should be explicitly granted.
  viewBudgetPlanSnapshotOnBudgetRequestReview: false,
  // Sensitive financial column — opt-in. Admin & users explicitly granted only.
  viewBudgetPlanRealization: false,
  dashboardView: 'department',
  viewAllDashboardDepartments: false,
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
  settings: true,
  viewDivision: true,
  viewDepartment: true,
  viewOriginOffice: true,
  viewProject: true,
  viewCategory: true,
  viewCategoryKeyIndex: true,
  viewCostCenter: true,
  viewOpexAllocation: true,
  viewCoa: true,
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
  createPaymentRequest: true,
  editPaymentRequest: true,
  deletePaymentRequest: true,
  createDivision: true,
  editDivision: true,
  deleteDivision: true,
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
  createOpexAllocation: true,
  editOpexAllocation: true,
  deleteOpexAllocation: true,
  createCoa: true,
  editCoa: true,
  deleteCoa: true,
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
  viewBudgetPlanRealization: true,
  viewBudgetPlanSnapshotOnBudgetRequestReview: true,
  dashboardView: 'fpa',
  viewAllDashboardDepartments: true,
};

/** Mengisi field akses baru untuk JSON lama yang disimpan di DB. */
export function mergeWithDefaultMenuAccess(stored: unknown): MenuAccess {
  const partial =
    stored && typeof stored === 'object' && !Array.isArray(stored)
      ? (stored as Partial<MenuAccess>)
      : {};
  return { ...defaultMenuAccess, ...partial };
}

export function mergeWithDefaultActivityAccess(
  stored: unknown,
  legacyMenuAccess?: unknown,
): ActivityAccess {
  const partial =
    stored && typeof stored === 'object' && !Array.isArray(stored)
      ? (stored as Partial<ActivityAccess>)
      : {};
  const legacy =
    legacyMenuAccess && typeof legacyMenuAccess === 'object' && !Array.isArray(legacyMenuAccess)
      ? (legacyMenuAccess as Partial<{ viewBudgetPlanRealization: boolean }>)
      : {};

  // Backward compatibility: older records stored this flag in menuAccess.
  // Preserve that grant during the transition to ActivityAccess.
  const migratedFromLegacy =
    partial.viewBudgetPlanRealization ?? legacy.viewBudgetPlanRealization;

  return {
    ...defaultActivityAccess,
    ...partial,
    dashboardView: parseDashboardView(partial.dashboardView ?? defaultActivityAccess.dashboardView),
    ...(migratedFromLegacy === undefined
      ? {}
      : { viewBudgetPlanRealization: migratedFromLegacy }),
  };
}
