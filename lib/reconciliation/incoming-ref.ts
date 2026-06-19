/**
 * Parse kode Budget Request dari kolom Description Confins.
 *
 * Format kesepakatan: `{KODE_BR}-{deskripsi invoice}` — delimiter `-` tanpa spasi
 * antara kode BR dan keterangan.
 * Contoh: `BRNOP202606004-INVOICE KJH INV-0010/OS/KJH/V/2025`
 */

/** Kode BR baru: `BR` + kode dept (2–5 huruf) + YYYYMM + urutan 3 digit. */
const NEW_BR_CODE_PATTERN = /^BR[A-Z]{2,5}\d{9}$/;

/** Kode BR legacy: `BR/{dept}/{seq}`. */
const LEGACY_BR_CODE_PATTERN = /^BR\/[A-Z0-9]+\/[A-Z0-9]+$/;

export function normalizeRefCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9/]/g, '');
}

export function looksLikeBudgetRequestCode(value: string): boolean {
  const normalized = normalizeRefCode(value);
  if (!normalized) return false;
  return NEW_BR_CODE_PATTERN.test(normalized) || LEGACY_BR_CODE_PATTERN.test(normalized);
}

/**
 * Ambil token kode BR dari string incoming (Description / Incoming ID).
 * Urutan: exact BR code → prefix sebelum `-` pertama → string kosong.
 */
export function parseBudgetRequestRefFromIncoming(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (looksLikeBudgetRequestCode(trimmed)) {
    return normalizeRefCode(trimmed);
  }

  const dashIndex = trimmed.indexOf('-');
  if (dashIndex > 0) {
    const prefix = trimmed.slice(0, dashIndex).trim();
    if (looksLikeBudgetRequestCode(prefix)) {
      return normalizeRefCode(prefix);
    }
  }

  return '';
}

export function isAutoMatchedByIncomingRef(requestCode: string, incomingRef: string): boolean {
  const normalizedRequest = normalizeRefCode(requestCode);
  if (!normalizedRequest) return false;

  const parsedIncoming = parseBudgetRequestRefFromIncoming(incomingRef);
  if (parsedIncoming) {
    return normalizedRequest === parsedIncoming;
  }

  return normalizedRequest === normalizeRefCode(incomingRef);
}
