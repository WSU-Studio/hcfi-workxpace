'use client';

import {
  ALL_FISCAL_YEARS,
  type FiscalYearFilterValue,
  getCurrentFiscalYear,
} from '@/lib/fiscal-year';

export interface FiscalYearFilterProps {
  /** Currently selected value (a year number or the "all" sentinel). */
  value: FiscalYearFilterValue;
  /** Notifies the parent when the user picks a different fiscal year. */
  onChange: (next: FiscalYearFilterValue) => void;
  /**
   * Active fiscal years available in the database (e.g. fetched from
   * `/api/fiscal-years`). The current year is always included even if the
   * server hasn't seeded it yet, so users can never "lose" the default
   * dropdown option.
   */
  availableYears: number[];
  /** Optional className passthrough for layout. */
  className?: string;
}

const SELECT_BASE_CLASSNAME =
  'h-10 rounded-lg border border-slate-400 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer hover:border-blue-500';

/**
 * Dropdown filter that scopes a list page to one fiscal year (default) or
 * lets the user explicitly opt into "All years".
 *
 * Single responsibility: render the FY filter and surface change events.
 * It does NOT fetch the year list itself — pass `availableYears` from the
 * parent so each consumer controls its own data source / caching.
 */
export default function FiscalYearFilter({
  value,
  onChange,
  availableYears,
  className,
}: FiscalYearFilterProps) {
  const currentYear = getCurrentFiscalYear();

  // Always surface the current year + any years we have data for, sorted desc.
  // Using a Set guarantees uniqueness if the server already returned it.
  const yearOptions = Array.from(new Set([currentYear, ...availableYears])).sort(
    (a, b) => b - a,
  );

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
          {year === currentYear ? `FY ${year} (Current)` : `FY ${year}`}
        </option>
      ))}
      <option disabled>──────────</option>
      <option value={ALL_FISCAL_YEARS}>All years</option>
    </select>
  );
}
