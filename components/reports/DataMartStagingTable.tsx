'use client';

import Link from 'next/link';
import {
  Table,
  TableBodyRow,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderRow,
} from '@/components/ui/Table';
import {
  DATA_MART_STAGING_COLUMN_COUNT,
  DATA_MART_STAGING_VISIBLE_COLUMNS,
  stagingColumnDisplayValue,
} from '@/lib/data-mart/staging-table-columns';
import type { DataMartStagingApiRow } from '@/types/data-mart-staging';
import { cn } from '@/lib/utils';

const DEFAULT_HEADER_CLASS =
  'whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900';

/**
 * Renders from `DATA_MART_STAGING_VISIBLE_COLUMNS` — the same list that drives
 * CSV export — so web table and download cannot drift in order or headers.
 */
export type DataMartStagingTableProps = {
  rows: DataMartStagingApiRow[];
};

export default function DataMartStagingTable({ rows }: DataMartStagingTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <Table className="min-w-[4300px] text-sm">
        <thead className="bg-sky-50">
          <TableHeaderRow>
            {DATA_MART_STAGING_VISIBLE_COLUMNS.map((col) => (
              <TableHead key={col.key} className={col.headerClassName ?? DEFAULT_HEADER_CLASS}>
                {col.header}
              </TableHead>
            ))}
          </TableHeaderRow>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={DATA_MART_STAGING_COLUMN_COUNT} className="pl-4 text-left text-gray-500">
              No staging rows for these filters.
            </TableEmptyRow>
          ) : (
            rows.map((row) => (
              <TableBodyRow key={row.id}>
                {DATA_MART_STAGING_VISIBLE_COLUMNS.map((col) => {
                  const display = stagingColumnDisplayValue(col, row);
                  const href = col.href?.(row) ?? null;
                  return (
                    <TableCell
                      key={col.key}
                      className={cn(col.cellClassName)}
                      title={col.title?.(row)}
                    >
                      {href && display !== '—' ? (
                        <Link href={href} className="text-blue-600 hover:underline">
                          {display}
                        </Link>
                      ) : (
                        display
                      )}
                    </TableCell>
                  );
                })}
              </TableBodyRow>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
