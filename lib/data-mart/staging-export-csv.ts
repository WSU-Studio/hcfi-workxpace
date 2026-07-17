import {
  DATA_MART_STAGING_VISIBLE_COLUMNS,
} from '@/lib/data-mart/staging-table-columns';
import type { DataMartStagingApiRow } from '@/types/data-mart-staging';

export function csvEscapeCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSV mirrors visible DataMartStagingTable columns (order + headers + values). */
export function buildStagingGuidelineCsv(rows: DataMartStagingApiRow[]): string {
  const headers = DATA_MART_STAGING_VISIBLE_COLUMNS.map((col) => csvEscapeCell(col.header)).join(',');

  const lines = rows.map((row) =>
    DATA_MART_STAGING_VISIBLE_COLUMNS.map((col) => csvEscapeCell(col.value(row))).join(',')
  );

  return [headers, ...lines].join('\n');
}
