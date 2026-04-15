/**
 * Kontrak data Confins (mock) untuk cash disbursement / pembayaran.
 * Saat API asli tersedia, response Confins sebaiknya dipetakan ke bentuk ini
 * agar lapisan rekonsiliasi tidak berubah.
 *
 * - incomingReferenceId: referensi Budget Request (code/ID) yang diinput user Confins.
 * - ebudgetRequestId: optional foreign key ke BudgetRequest.id bila tersedia.
 */
export type ConfinsPaymentSource = 'Core' | 'E-GL' | 'Manual';

export type ConfinsCashDisbursement = {
  /** ID unik dokumen pembayaran di Confins (document/payment id). */
  id: string;
  /** Referensi ke Form ID budget request (harus sama persis dengan `code`, mis. BR/IT/001). */
  incomingReferenceId: string;
  voucherNumber: string;
  postDate: string;
  fiscalYear: number;
  /** Bulan kalender 1–12 (derivasi dari postDate untuk filter). */
  month: number;
  source: ConfinsPaymentSource;
  ebudgetPlanId: string | null;
  ebudgetPlanCode?: string | null;
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
