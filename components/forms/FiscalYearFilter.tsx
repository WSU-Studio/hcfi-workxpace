'use client';

import {
  ALL_FISCAL_YEARS,
  type FiscalYearFilterValue,
  fiscalYearSelectLabel,
  getSelectableFiscalYears,
} from '@/lib/fiscal-year';

export interface FiscalYearFilterProps {
  /** Currently selected value (a year number or the "all" sentinel). */
  value: FiscalYearFilterValue;
  /** Notifies the parent when the user picks a different fiscal year. */
  onChange: (next: FiscalYearFilterValue) => void;
  /** Optional className passthrough for layout. */
  className?: string;
}

const SELECT_BASE_CLASSNAME =
  'h-10 rounded-lg border border-slate-400 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer hover:border-blue-500';

/**
 * Dropdown filter that scopes a list page to one fiscal year (default) or
 * lets the user explicitly opt into "All years".
 *
 * Options are current (N) and next (N+1) only — older years are not listed.
 * "All years" remains so historical documents stay findable without putting
 * those years back into the picker.
 */
export default function FiscalYearFilter({
  value,
  onChange,
  className,
}: FiscalYearFilterProps) {
  const yearOptions = getSelectableFiscalYears();

  const selectValue =
    value === ALL_FISCAL_YEARS ? ALL_FISCAL_YEARS : String(value);

  return (
    <select
      value={selectValue}
      onChange={(event) => {
        const next = event.target.value;
        onChange(next === ALL_FISCAL_YEARS ? ALL_FISCAL_YEARS : Number(next));
      }}
      className={`${SELECT_BASE_CLASSNAME} ${className ?? ''}`}
      aria-label="Filter by fiscal year"
    >
      {yearOptions.map((year) => (
        <option key={year} value={String(year)}>
          {fiscalYearSelectLabel(year)}
        </option>
      ))}
      <option disabled>──────────</option>
      <option value={ALL_FISCAL_YEARS}>All years</option>
    </select>
  );
}
