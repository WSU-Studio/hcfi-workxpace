import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';
import { computeGrandTotalPeriodAllocation } from '@/lib/budget-requests/form';
import { formatCurrency } from '@/lib/utils';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type BudgetRequestPeriodAllocationSummaryProps = {
  /** Item / transaction total (inc. tax) — not yet multiplied by months. */
  grandTotal: number;
  monthCount: number;
  allocations?: { year: number; month: number; allocation: number }[];
};

export default function BudgetRequestPeriodAllocationSummary({
  grandTotal,
  monthCount,
  allocations = [],
}: BudgetRequestPeriodAllocationSummaryProps) {
  const brGrandTotal = computeGrandTotalPeriodAllocation(grandTotal, monthCount);

  if (monthCount <= 0 || grandTotal <= 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs text-gray-500">
        Grand total BR = item subtotal (inc. tax) × number of selected months.
      </p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Item subtotal (inc. tax)</span>
        <span className="font-medium tabular-nums text-gray-900">{formatCurrency(grandTotal)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">× Selected months</span>
        <span className="font-medium tabular-nums text-gray-900">{monthCount}</span>
      </div>

      {allocations.length > 0 ? (
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Allocation</TableHead>
            </TableHeaderRow>
          </thead>
          <tbody>
            {allocations.map((allocation) => (
              <TableBodyRow key={`${allocation.year}-${allocation.month}`}>
                <TableCell>
                  {MONTH_NAMES[allocation.month - 1]} {allocation.year}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(Number(allocation.allocation ?? 0))}
                </TableCell>
              </TableBodyRow>
            ))}
          </tbody>
        </Table>
      ) : null}

      <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-bold text-gray-900">
        <span>Grand total</span>
        <span className="tabular-nums">{formatCurrency(brGrandTotal)}</span>
      </div>
    </div>
  );
}
