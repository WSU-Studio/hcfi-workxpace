/**
 * Reset seluruh simpanan rekonsiliasi hanya boleh aktif di development atau jika
 * RECONCILIATION_ALLOW_RESET=true (staging / QA). Menghindari penghapusan massal di produksi.
 */
export function isReconciliationResetAllowed(): boolean {
  if (process.env.RECONCILIATION_ALLOW_RESET === 'true') return true;
  if (process.env.NODE_ENV === 'development') return true;
  return false;
}
