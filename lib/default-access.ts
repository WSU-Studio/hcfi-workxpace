import { MenuAccess, ActivityAccess } from '@/types/access-control';

export const defaultMenuAccess: MenuAccess = {
  dashboard: true,
  budgetPlans: true,
  budgetRequests: true,
  userManagement: true,
  workspaceManagement: true,
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
  createProject: false,
  editProject: false,
  deleteProject: false,
  createRole: false,
  editRole: false,
  deleteRole: false,
  createApprovalSchema: false,
  editApprovalSchema: false,
  deleteApprovalSchema: false,
  createUser: false,
  editUser: false,
  deleteUser: false,
};

/** Full access for admin role - used when user has ADMIN roleCode */
export const fullMenuAccess: MenuAccess = {
  dashboard: true,
  budgetPlans: true,
  budgetRequests: true,
  userManagement: true,
  workspaceManagement: true,
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
  createProject: true,
  editProject: true,
  deleteProject: true,
  createRole: true,
  editRole: true,
  deleteRole: true,
  createApprovalSchema: true,
  editApprovalSchema: true,
  deleteApprovalSchema: true,
  createUser: true,
  editUser: true,
  deleteUser: true,
};
