/**
 * Fiscal year helpers used by list-page filters & default selectors.
 *
 * HCFI's fiscal year currently aligns with the calendar year (Jan-Dec). If
 * that ever changes (e.g. April-March), update only this file — every list
 * page reads `getCurrentFiscalYear()` and will pick up the new boundary
 * without further changes (single source of truth).
 *
 * Selectable years on create/filter dropdowns are N (current) and N+1 only.
 * Older years stay on existing documents and remain reachable via "All years"
 * on list filters; they are not offered as individual picker options.
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
 * Years that may appear in create / filter / report dropdowns: current (N)
 * then next (N+1). Computed — does not depend on the FiscalYear master table,
 * so N+1 is available even before it is seeded.
 */
export function getSelectableFiscalYears(now: Date = new Date()): number[] {
  const current = getCurrentFiscalYear(now);
  return [current, current + 1];
}

export function isSelectableFiscalYear(year: number, now: Date = new Date()): boolean {
  return getSelectableFiscalYears(now).includes(year);
}

/**
 * Create/import must use N or N+1. Updates may keep a document's existing year
 * (or a linked parent document's year) so old drafts remain saveable.
 */
export function isAllowedFiscalYearForWrite(
  year: number,
  extraAllowedYears: Array<number | null | undefined> = [],
  now: Date = new Date(),
): boolean {
  if (isSelectableFiscalYear(year, now)) return true;
  return extraAllowedYears.some((candidate) => candidate != null && candidate === year);
}

export function selectableFiscalYearMessage(now: Date = new Date()): string {
  const [current, next] = getSelectableFiscalYears(now);
  return `Fiscal year must be ${current} or ${next}`;
}

export function assertFiscalYearWritable(
  year: unknown,
  extraAllowedYears: Array<number | null | undefined> = [],
  now: Date = new Date(),
): { ok: true; year: number } | { ok: false; error: string } {
  const parsed = typeof year === 'number' ? year : Number(year);
  if (!Number.isFinite(parsed)) {
    return { ok: false, error: 'Valid fiscal year is required' };
  }
  const truncated = Math.trunc(parsed);
  if (isAllowedFiscalYearForWrite(truncated, extraAllowedYears, now)) {
    return { ok: true, year: truncated };
  }
  return { ok: false, error: selectableFiscalYearMessage(now) };
}

/**
 * Dropdown options: N and N+1 first, then any extra years (edit of a document
 * already booked on an older FY) so the current value stays valid.
 */
export function fiscalYearSelectOptions(
  includeYears: Array<number | null | undefined> = [],
  now: Date = new Date(),
): { year: number }[] {
  const selectable = getSelectableFiscalYears(now);
  const extras = new Set<number>();
  for (const raw of includeYears) {
    if (raw == null || !Number.isFinite(raw)) continue;
    const year = Math.trunc(raw);
    if (!selectable.includes(year)) extras.add(year);
  }
  const extraList = [...extras].sort((a, b) => b - a);
  return [...selectable, ...extraList].map((year) => ({ year }));
}

export function fiscalYearSelectLabel(year: number, now: Date = new Date()): string {
  return year === getCurrentFiscalYear(now) ? `FY ${year} (Current)` : `FY ${year}`;
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
