import {
  PIVOT_HIERARCHY_COLUMN_COUNT,
  PIVOT_HIERARCHY_HEADERS,
  PIVOT_METRICS,
  PIVOT_METRIC_LABELS,
  type MetricMap,
  type PivotMetric,
  type PivotedReport,
} from './budget-pivot';

/**
 * Build a workbook that mirrors HCFI's "Opex Management" mockup: hierarchy
 * columns on the left (including BR No) + 3 metric blocks (Actual / BR / BP)
 * on the right, each block = 12 monthly cells + FY total. Column section
 * labels use merged cells so the export visually matches the on-screen
 * 3-section view.
 *
 * Triggers a browser download with the supplied `fileName`. Lazy-imports
 * `xlsx` (SheetJS) so it's not part of the initial bundle.
 *
 * Single responsibility: serialize an in-memory `PivotedReport` into XLSX
 * matching the mockup. UI concerns (filenames, click handlers) live at the
 * page layer.
 */

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const HIERARCHY_COL_COUNT = PIVOT_HIERARCHY_COLUMN_COUNT;
const CELLS_PER_METRIC = 13; // 12 months + FY

type Row = Array<string | number | null>;

function metricBlockHeader(metric: PivotMetric, yearSuffix: string): Row {
  const months = MONTH_LABELS.map((m) => `${m}-${yearSuffix}`);
  return [...months, 'FY'];
}

function metricValuesRow(metrics: MetricMap, visibleMetrics: readonly PivotMetric[]): Row {
  const out: Row = [];
  for (const metric of visibleMetrics) {
    for (const v of metrics[metric].monthly) out.push(v);
    out.push(metrics[metric].fy);
  }
  return out;
}

export interface ExportPivotXlsxOptions {
  fiscalYear: number;
  /** Defaults to all three metric blocks (matches the mockup). */
  visibleMetrics?: readonly PivotMetric[];
  /** File name without extension. ".xlsx" is appended automatically. */
  fileName?: string;
  /** Optional plain-text snapshot of the active filters, written to row 1. */
  filterCaption?: string;
}

export async function exportPivotToXlsx(
  data: PivotedReport,
  {
    fiscalYear,
    visibleMetrics = PIVOT_METRICS,
    fileName = `budget-pivot-${fiscalYear}`,
    filterCaption,
  }: ExportPivotXlsxOptions,
): Promise<void> {
  const XLSX = await import('xlsx');
  const yearSuffix = String(fiscalYear).slice(-2);

  const aoa: Row[] = [];

  // Row 1: title
  aoa.push([`Budget Pivot — FY ${fiscalYear}`]);
  // Row 2: filter caption (optional, single cell)
  aoa.push([filterCaption ?? '']);
  // Row 3: blank spacer
  aoa.push([]);

  // Row 4: section labels (Actual / Budget Request / Budget Plan), merged in
  // !merges below. Place label at the first column of each block, leave the
  // rest blank.
  const sectionRow: Row = Array.from({ length: HIERARCHY_COL_COUNT }, () => '');
  for (const metric of visibleMetrics) {
    sectionRow.push(PIVOT_METRIC_LABELS[metric]);
    for (let i = 1; i < CELLS_PER_METRIC; i++) sectionRow.push('');
  }
  aoa.push(sectionRow);

  // Row 5: column headers
  const headerRow: Row = [...PIVOT_HIERARCHY_HEADERS];
  for (const metric of visibleMetrics) {
    headerRow.push(...metricBlockHeader(metric, yearSuffix));
  }
  aoa.push(headerRow);

  // Body
  for (const origin of data.origins) {
    let firstLeafOfOrigin = true;
    for (const dept of origin.departments) {
      let firstLeafOfDept = true;
      for (const leaf of dept.leaves) {
        const baseRow: Row = [
          firstLeafOfOrigin ? origin.originOffice : '',
          firstLeafOfDept ? dept.department : '',
          leaf.categoryKeyIndex,
          leaf.expenseCategory,
          leaf.glAccountCode,
          leaf.glAccountName,
          leaf.budgetRequestCode,
          leaf.description,
        ];
        baseRow.push(...metricValuesRow(leaf.metrics, visibleMetrics));
        aoa.push(baseRow);
        firstLeafOfOrigin = false;
        firstLeafOfDept = false;
      }
      // Department subtotal row
      const deptSubRow: Row = [
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        `Subtotal — ${dept.department}`,
      ];
      deptSubRow.push(...metricValuesRow(dept.subtotals, visibleMetrics));
      aoa.push(deptSubRow);
    }
    // Origin office total row
    const originTotalRow: Row = [
      `Total — ${origin.originOffice}`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ];
    originTotalRow.push(...metricValuesRow(origin.subtotals, visibleMetrics));
    aoa.push(originTotalRow);
  }

  // Grand total
  if (data.origins.length > 0) {
    const grandRow: Row = ['Grand Total', '', '', '', '', '', '', ''];
    grandRow.push(...metricValuesRow(data.grandTotals, visibleMetrics));
    aoa.push(grandRow);
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  // Merge section label cells (row index = 3 in 0-indexed AoA → row 4 in
  // 1-indexed XLSX), one merge per visible metric block.
  const sectionRowIdx = 3;
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
  for (let i = 0; i < visibleMetrics.length; i++) {
    const startCol = HIERARCHY_COL_COUNT + i * CELLS_PER_METRIC;
    const endCol = startCol + CELLS_PER_METRIC - 1;
    merges.push({
      s: { r: sectionRowIdx, c: startCol },
      e: { r: sectionRowIdx, c: endCol },
    });
  }
  // Title row spans the whole table width.
  const totalCols = HIERARCHY_COL_COUNT + visibleMetrics.length * CELLS_PER_METRIC;
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });
  if (filterCaption) {
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } });
  }
  sheet['!merges'] = merges;

  // Reasonable default column widths (rough mirror of mockup).
  sheet['!cols'] = [
    { wch: 14 }, // Origin Office
    { wch: 14 }, // Department
    { wch: 18 }, // Category Key Index
    { wch: 18 }, // Expense Category
    { wch: 16 }, // GL Account
    { wch: 28 }, // GL Account Name
    { wch: 18 }, // BR No
    { wch: 32 }, // Description
    ...Array.from({ length: visibleMetrics.length * CELLS_PER_METRIC }, () => ({ wch: 12 })),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Report');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
