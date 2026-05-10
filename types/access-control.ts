export interface MenuAccess {
  dashboard: boolean;
  budgetPlans: boolean;
  budgetRequests: boolean;
  reconciliation: boolean;
  /** Laporan tersimpan (rekonsiliasi, dll.) */
  reports: boolean;
  userManagement: boolean;
  workspaceManagement: boolean;
  settings?: boolean;
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
  /** Menjalankan sinkronisasi / integrasi data pembayaran (mis. Confins). */
  runReconciliationSync: boolean;
  /** Koreksi pencocokan manual antara pembayaran eksternal dan plan/request. */
  editReconciliationMapping: boolean;
  /** Simpan hasil match ke database (menghilangkan baris dari daftar kerja). */
  saveReconciliationResult: boolean;
}
