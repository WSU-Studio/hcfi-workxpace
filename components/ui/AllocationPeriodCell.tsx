'use client';

import {
  formatAllocatedMonthLabels,
  formatFiscalYearLabel,
} from '@/lib/allocation-period';

export type AllocationPeriodCellProps = {
  fiscalYear?: number | null;
  months: number[];
};

/**
 * Two-line allocation summary for document lists: fiscal year, then which
 * months have a positive allocation. Presentation only (SRP).
 */
export default function AllocationPeriodCell({
  fiscalYear,
  months,
}: AllocationPeriodCellProps) {
  return (
    <div className="flex min-w-[8rem] max-w-[12rem] flex-col">
      <span>{formatFiscalYearLabel(fiscalYear)}</span>
      <span className="text-xs text-gray-500">{formatAllocatedMonthLabels(months)}</span>
    </div>
  );
}
