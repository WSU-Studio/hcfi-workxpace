'use client';

import { useState } from 'react';
import {
  Table,
  TableEmptyRow,
  TableHead,
  TableHeaderRow,
} from '@/components/ui/Table';
import BudgetRealizationRow from './BudgetRealizationRow';
import type { BudgetRealizationRow as BudgetRealizationRowType } from '@/types/budget-realization';

const COLUMNS = [
  { label: '#', align: 'left' },
  { label: '', align: 'left' },
  { label: 'Plan Code', align: 'left' },
  { label: 'Subject', align: 'left' },
  { label: 'Department', align: 'left' },
  { label: 'Status', align: 'left' },
  { label: 'Requests', align: 'left' },
  { label: 'Plan Total', align: 'right' },
  { label: 'Requested Total', align: 'right' },
  { label: 'Utilization', align: 'left' },
] as const;

export interface BudgetRealizationTableProps {
  rows: BudgetRealizationRowType[];
}

/**
 * Render daftar realisasi. State expand/collapse dikelola di sini agar
 * row component (BudgetRealizationRow) tetap presentational dan reusable.
 */
export default function BudgetRealizationTable({ rows }: BudgetRealizationTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (planId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <Table className="min-w-[1100px] text-sm">
        <thead className="bg-sky-50">
          <TableHeaderRow className="border-sky-100">
            {COLUMNS.map((col, i) => (
              <TableHead
                key={`${col.label}-${i}`}
                className={`whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900 ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.label}
              </TableHead>
            ))}
          </TableHeaderRow>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={COLUMNS.length}>
              No budget plans match the selected filters.
            </TableEmptyRow>
          ) : (
            rows.map((row, i) => (
              <BudgetRealizationRow
                key={row.planId}
                row={row}
                index={i}
                isExpanded={expandedIds.has(row.planId)}
                onToggle={toggle}
                columnCount={COLUMNS.length}
              />
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
