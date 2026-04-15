/**
 * Kontrak data Confins (mock) untuk cash disbursement / pembayaran.
 * Saat API asli tersedia, response Confins sebaiknya dipetakan ke bentuk ini
 * agar lapisan rekonsiliasi tidak berubah.
 *
 * - ebudgetPlanId: ID BudgetPlan di eBudgeting (diinput user Confins saat buat pembayaran).
 * - ebudgetRequestId: opsional; jika Confins nanti menyimpan FK ke request, isi field ini.
 */
export type ConfinsPaymentSource = 'Core' | 'E-GL' | 'Manual';

export type ConfinsCashDisbursement = {
  /** ID unik dokumen pembayaran di Confins (document/payment id). */
  id: string;
  /** Referensi ke Form ID budget plan (harus sama persis dengan `code`, mis. IT2026003). */
  incomingReferenceId: string;
  voucherNumber: string;
  postDate: string;
  fiscalYear: number;
  /** Bulan kalender 1–12 (derivasi dari postDate untuk filter). */
  month: number;
  source: ConfinsPaymentSource;
  ebudgetPlanId: string;
  ebudgetPlanCode?: string;
  ebudgetRequestId: string | null;
  ebudgetRequestCode?: string | null;
  description: string;
  glAccountCode: string;
  glAccountName: string;
  /** Nominal pembayaran (string desimal untuk konsistensi JSON). */
  amount: string;
  currency: string;
  departmentId: string | null;
  departmentCode: string | null;
  updatedAt: string;
};

export type ConfinsMockListMeta = {
  lastSyncedAt: string;
  recordCount: number;
  /** true jika ada pembayaran yang dibentuk dari BudgetRequest Approved di DB lokal. */
  usedLocalApprovedRequests: boolean;
};
