/**
 * Reset seluruh simpanan rekonsiliasi.
 * - RECONCILIATION_ALLOW_RESET=true  → always allow (TQA / staging)
 * - RECONCILIATION_ALLOW_RESET=false → always deny (incl. local + production)
 * - unset → allow only when NODE_ENV=development
 */
export function isReconciliationResetAllowed(): boolean {
  const flag = process.env.RECONCILIATION_ALLOW_RESET;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV === 'development';
}
