/**
 * Fiscal year helpers used by list-page filters & default selectors.
 *
 * HCFI's fiscal year currently aligns with the calendar year (Jan-Dec). If
 * that ever changes (e.g. April-March), update only this file — every list
 * page reads `getCurrentFiscalYear()` and will pick up the new boundary
 * without further changes (single source of truth).
 */

/** Sentinel value used by filter dropdowns to mean "no fiscal year filter". */
export const ALL_FISCAL_YEARS = 'all' as const;

export type FiscalYearFilterValue = number | typeof ALL_FISCAL_YEARS;

/**
 * The fiscal year that contains today's date.
 *
 * @example HCFI calendar-year fiscal: returns `2026` between Jan 1 - Dec 31, 2026.
 */
export function getCurrentFiscalYear(now: Date = new Date()): number {
  return now.getFullYear();

  // If/when HCFI moves to an Apr-Mar fiscal year, swap the body for:
  //   return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Parse a fiscal-year query string value into a usable filter value.
 *
 * Accepts the raw `?fiscalYear=` value (or any unknown). Returns `null` when
 * the param is absent so the caller can decide its own default.
 */
export function parseFiscalYearParam(
  raw: string | null | undefined,
): FiscalYearFilterValue | null {
  if (raw == null || raw === '') return null;
  if (raw === ALL_FISCAL_YEARS) return ALL_FISCAL_YEARS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 2100) return null;
  return Math.trunc(parsed);
}

/**
 * Serialize a filter value for use as a query-string parameter.
 */
export function serializeFiscalYearParam(value: FiscalYearFilterValue): string {
  return value === ALL_FISCAL_YEARS ? ALL_FISCAL_YEARS : String(value);
}
