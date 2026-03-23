export interface MenuAccess {
  dashboard: boolean;
  budgetPlans: boolean;
  budgetRequests: boolean;
  userManagement: boolean;
  workspaceManagement: boolean;
}

export interface ActivityAccess {
  createBudgetPlan: boolean;
  editBudgetPlan: boolean;
  deleteBudgetPlan: boolean;
  createBudgetRequest: boolean;
  editBudgetRequest: boolean;
  deleteBudgetRequest: boolean;
  createDepartment: boolean;
  editDepartment: boolean;
  deleteDepartment: boolean;
  createProject: boolean;
  editProject: boolean;
  deleteProject: boolean;
  createRole: boolean;
  editRole: boolean;
  deleteRole: boolean;
  createApprovalSchema: boolean;
  editApprovalSchema: boolean;
  deleteApprovalSchema: boolean;
  createUser: boolean;
  editUser: boolean;
  deleteUser: boolean;
}
