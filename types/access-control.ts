export interface MenuAccess {
  dashboard: boolean;
  budgetPlans: boolean;
  budgetRequests: boolean;
  /** Permohonan pembayaran — approval internal Workxpace (terpisah dari eksekusi Confins). */
  paymentRequests: boolean;
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
  createPaymentRequest: boolean;
  editPaymentRequest: boolean;
  deletePaymentRequest: boolean;
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
  /**
   * Mengubah hak akses (Menu / Activity / Workspace Management Access) milik
   * user lain. Terpisah dari `editUser` (yang hanya mengedit data profil
   * dasar). Default `false`: tombol "Access Control" disembunyikan dan
   * endpoint PUT user access menolak dengan 403.
   */
  changeAccess: boolean;
  /** Menjalankan sinkronisasi / integrasi data pembayaran (mis. Confins). */
  runReconciliationSync: boolean;
  /** Koreksi pencocokan manual antara pembayaran eksternal dan plan/request. */
  editReconciliationMapping: boolean;
  /** Simpan hasil match ke database (menghilangkan baris dari daftar kerja). */
  saveReconciliationResult: boolean;
  /**
   * Membuat BP/BR/PR untuk department selain department milik user.
   * Default `false`: kolom Department di form Create dikunci ke department user.
   * Bila `true`: kolom Department menjadi dropdown pilih bebas (cross-department).
   */
  createForOtherDepartment: boolean;
  /**
   * Melihat BP/BR/PR yang dibuat oleh department lain (list & dropdown).
   * Default `false`: list pages hanya menampilkan dokumen dari department user.
   * Bila `true`: user melihat dokumen lintas department (mis. reviewer finance
   * yang menangani banyak department).
   */
  viewOtherDepartmentDocuments: boolean;
  /**
   * Mengedit field Classification (Cost Center, Category, Category Key Index,
   * Kode Akun, OPEX/CAPEX Type, OPEX Allocation) pada halaman Review BP/BR/PR.
   * Default `false`: section Classification dirender read-only meskipun user
   * adalah reviewer yang berwenang di step saat ini. Hak ini dipisah agar
   * accounting / finance controller dapat membatasi siapa yang boleh men-tag
   * dokumen ke akun & cost center tertentu tanpa mencabut hak review.
   */
  editClassificationSection: boolean;
  /** Lihat kolom Realization & Outstanding di Budget Plan (data finansial sensitif). */
  viewBudgetPlanRealization: boolean;
  /**
   * Melihat kartu "Budget Plan Status" pada halaman review Budget Request,
   * termasuk nilai Plan total, Realized, Outstanding, dan proyeksi
   * Outstanding setelah approval.
   */
  viewBudgetPlanSnapshotOnBudgetRequestReview: boolean;
}
