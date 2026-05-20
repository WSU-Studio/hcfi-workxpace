/**
 * Secondary identifier (signature) untuk baris pembayaran Confins.
 *
 * Dipakai sebagai jalur match utama ketika memfilter baris "Marked Unused" /
 * "Saved" terhadap hasil sync — karena `payment.id` (content hash) sendiri
 * sebenarnya juga sudah turunan dari field stabil yang sama. Punya signature
 * eksplisit bermanfaat untuk:
 *   1. Backward-compat dengan record yang ditandai sebelum perubahan
 *      algoritma `stableRowId`.
 *   2. Mitigasi jika ada perbedaan minor di field non-bisnis (mis. casing,
 *      whitespace) yang mengubah content hash tapi tidak mengubah identitas
 *      bisnis baris.
 *
 * PENTING: `InterfaceID` dari Confins EGL diregenerate setiap API call
 * (identitas sesi, bukan identitas baris) — SENGAJA tidak dipakai di sini.
 *
 * Komposisi (semua field stabil & tersedia di DB unused/saved):
 *   PaymentRequestNo | JournalNo | GLAccountCode | PaidAmount(cents)
 *
 * Amount dibulatkan ke cent untuk menghindari noise floating point.
 */
export function buildPaymentSignature(args: {
  paymentRequestNo?: string | null;
  journalNo?: string | null;
  glAccountCode?: string | null;
  paidAmount?: number | string | null;
}): string {
  const amt = Math.round(Number(args.paidAmount ?? 0) * 100);
  const pr = (args.paymentRequestNo ?? '').trim();
  const jn = (args.journalNo ?? '').trim();
  const gl = (args.glAccountCode ?? '').trim();
  return `${pr}|${jn}|${gl}|${amt}`;
}

/** Apakah signature ini berisi cukup data untuk dipakai sebagai fallback match? */
export function isUsablePaymentSignature(signature: string): boolean {
  const parts = signature.split('|');
  if (parts.length < 4) return false;
  const [pr, jn, gl, amt] = parts;
  return Boolean(pr || jn) && Boolean(gl) && amt !== '0';
}
