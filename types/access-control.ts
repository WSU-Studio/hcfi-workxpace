export interface MenuAccess {
  dashboard: boolean;
  budgetPlans: boolean;
  budgetRequests: boolean;
  userManagement: boolean;
  workspaceManagement: boolean;
  viewDepartment: boolean;
  viewOriginOffice: boolean;
  viewProject: boolean;
  viewCategory: boolean;
  viewCategoryKeyIndex: boolean;
  viewCostCenter: boolean;
  viewRole: boolean;
  viewApprovalSchema: boolean;
  viewActivityHistory: boolean;
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
  createOriginOffice: boolean;
  editOriginOffice: boolean;
  deleteOriginOffice: boolean;
  createProject: boolean;
  editProject: boolean;
  deleteProject: boolean;
  createRole: boolean;
  editRole: boolean;
  deleteRole: boolean;
  createApprovalSchema: boolean;
  editApprovalSchema: boolean;
  deleteApprovalSchema: boolean;
  createCategory: boolean;
  editCategory: boolean;
  deleteCategory: boolean;
  createCategoryKeyIndex: boolean;
  editCategoryKeyIndex: boolean;
  deleteCategoryKeyIndex: boolean;
  createCostCenter: boolean;
  editCostCenter: boolean;
  deleteCostCenter: boolean;
  createUser: boolean;
  editUser: boolean;
  deleteUser: boolean;
}
