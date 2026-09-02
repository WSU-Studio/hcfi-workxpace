'use client';

import Select from '@/components/ui/Select';
import { fiscalYearSelectLabel, fiscalYearSelectOptions } from '@/lib/fiscal-year';

export interface FiscalYearSelectProps {
  value: number | string;
  onChange: (year: number) => void;
  /**
   * Extra years to keep visible — used when editing a document already booked
   * on an older FY so the current value stays valid. Not shown on create.
   */
  includeYears?: Array<number | null | undefined>;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

/**
 * Single-year picker. Options are always current (N) and next (N+1), plus any
 * `includeYears` for in-flight documents. Does not fetch — years are computed
 * in `lib/fiscal-year.ts` (single source of truth).
 */
export default function FiscalYearSelect({
  value,
  onChange,
  includeYears = [],
  required,
  disabled,
  readonly,
  id,
  name,
  className,
}: FiscalYearSelectProps) {
  const options = fiscalYearSelectOptions(includeYears);

  return (
    <Select
      id={id}
      name={name}
      value={String(value)}
      onChange={(event) => onChange(Number(event.target.value))}
      required={required}
      disabled={disabled}
      readonly={readonly}
      className={className}
      aria-label="Fiscal year"
    >
      {options.map(({ year }) => (
        <option key={year} value={String(year)}>
          {fiscalYearSelectLabel(year)}
        </option>
      ))}
    </Select>
  );
}
