'use client';

import { Fragment } from 'react';
import { formatCurrency, formatSignedCurrency } from '@/lib/utils';
import {
  PIVOT_METRICS,
  PIVOT_METRIC_LABELS,
  type MetricMap,
  type MonthlyAmounts,
  type PivotMetric,
  type PivotedReport,
} from '@/lib/data-mart/budget-pivot';

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

const HIERARCHY_COLUMN_COUNT = 7; // origin, dept, cki, expense, glCode, glName, description

/** Sticky subtotal/total label width. Use `w-*` (not only `max-w-*`) — table
 *  column width follows min-/width of cells; `max-w` alone never expands them. */
const STICKY_LABEL_WIDTH_CLASS = 'w-[240px]';

/**
 * View mode controls how many metric blocks are rendered side-by-side.
 * - `'three-section'`: Actual / Budget Request / Budget Plan (mockup layout).
 * - `'single-metric'`: only the metric specified by `singleMetric`.
 */
export type BudgetPivotViewMode = 'three-section' | 'single-metric';

export interface BudgetPivotTableProps {
  data: PivotedReport;
  /** 4-digit year used by the month-column headers (e.g. "Jan-26"). */
  fiscalYear: number;
  viewMode: BudgetPivotViewMode;
  /** Required when viewMode === 'single-metric'. Defaults to 'budgetPlan'. */
  singleMetric?: PivotMetric;
  emptyMessage?: string;
}

interface MonthCellsProps {
  values: MonthlyAmounts;
  /** Override row borders for subtotal / grand-total contexts. */
  borderClassName?: string;
  /** Show "—" instead of "0" for empty months on detail rows. */
  dimEmpty?: boolean;
  /** Mark the right-edge of a section block (visual separator). */
  trailingFyClassName?: string;
  /** FY total renders right after the 12 monthly cells. */
  fy: number;
  fyClassName?: string;
}

function MonthCells({
  values,
  borderClassName = 'border-b border-slate-100',
  dimEmpty = true,
  fy,
  fyClassName = 'border-b border-slate-100 bg-sky-50/50 px-3 py-1.5 text-right tabular-nums whitespace-nowrap font-medium text-slate-900',
  trailingFyClassName,
}: MonthCellsProps) {
  return (
    <>
      {values.map((amount, idx) => (
        <td
          key={idx}
          className={`${borderClassName} px-3 py-1.5 text-right tabular-nums whitespace-nowrap`}
        >
          {amount !== 0 ? (
            formatSignedCurrency(amount)
          ) : dimEmpty ? (
            <span className="opacity-40">—</span>
          ) : (
            formatCurrency(0)
          )}
        </td>
      ))}
      <td className={trailingFyClassName ?? fyClassName}>{formatSignedCurrency(fy)}</td>
    </>
  );
}

/**
 * Render a row of value cells across the visible metric blocks.
 * Encapsulates the "section-block" rendering pattern (12 month cells + FY)
 * so the body / subtotals / grand-total all stay consistent.
 */
function MetricCellsRow({
  metrics,
  visibleMetrics,
  borderClassName,
  dimEmpty,
  fyCellClassName,
}: {
  metrics: MetricMap;
  visibleMetrics: readonly PivotMetric[];
  borderClassName?: string;
  dimEmpty?: boolean;
  fyCellClassName?: string;
}) {
  return (
    <>
      {visibleMetrics.map((metric) => (
        <MonthCells
          key={metric}
          values={metrics[metric].monthly}
          fy={metrics[metric].fy}
          borderClassName={borderClassName}
          dimEmpty={dimEmpty}
          fyClassName={fyCellClassName}
        />
      ))}
    </>
  );
}

/**
 * Renders a Budget Pivot report (hierarchy on the left, months across the
 * top, FY total at the right of each metric section). Subtotals at every
 * grouping level + grand-total footer for at-a-glance reads.
 *
 * Single responsibility: presentation. All aggregation lives in
 * `lib/data-mart/budget-pivot.ts` so this stays a pure projection of `data`.
 */
export default function BudgetPivotTable({
  data,
  fiscalYear,
  viewMode,
  singleMetric = 'budgetPlan',
  emptyMessage = 'No data for the selected filters.',
}: BudgetPivotTableProps) {
  const yearSuffix = String(fiscalYear).slice(-2);

  const visibleMetrics: readonly PivotMetric[] =
    viewMode === 'three-section' ? PIVOT_METRICS : [singleMetric];

  const cellsPerMetric = 13; // 12 months + FY
  const valueColumnCount = visibleMetrics.length * cellsPerMetric;
  const totalColumnCount = HIERARCHY_COLUMN_COUNT + valueColumnCount;
  const minTableWidthPx = 900 + visibleMetrics.length * 950;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-xs" style={{ minWidth: `${minTableWidthPx}px` }}>
        <thead className="bg-sky-50">
          {/* Section labels (only meaningful in 3-section view, but we still
              render in single-metric mode for visual consistency / export
              parity). */}
          <tr>
            {/* Sticky corner above Origin Office — same width as the sticky col
                so section labels (Actual / BR / BP) stay aligned when scrolling. */}
            <th
              className={`sticky left-0 z-10 ${STICKY_LABEL_WIDTH_CLASS} min-w-[240px] border-b border-slate-200 bg-sky-50 px-3 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}
            />
            <th
              colSpan={HIERARCHY_COLUMN_COUNT - 1}
              className="border-b border-r border-slate-200 bg-sky-50 px-3 py-2"
            />
            {visibleMetrics.map((metric, idx) => (
              <th
                key={metric}
                colSpan={cellsPerMetric}
                className={`border-b border-slate-200 px-3 py-2 text-center font-semibold uppercase tracking-wide text-sky-900 bg-sky-100/50 ${
                  idx > 0 ? 'border-l-2 border-sky-200' : ''
                }`}
              >
                {PIVOT_METRIC_LABELS[metric]}
              </th>
            ))}
          </tr>
          <tr className="text-left">
            <th
              className={`sticky left-0 z-10 ${STICKY_LABEL_WIDTH_CLASS} min-w-[240px] bg-sky-50 border-b border-slate-200 px-3 py-2 font-semibold uppercase tracking-wide text-sky-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}
            >
              Origin Office
            </th>
            <th className="min-w-[120px] border-b border-slate-200 px-3 py-2 font-semibold uppercase tracking-wide text-sky-900">
              Department
            </th>
            <th className="min-w-[160px] border-b border-slate-200 px-3 py-2 font-semibold uppercase tracking-wide text-sky-900">
              Category Key Index
            </th>
            <th className="min-w-[160px] border-b border-slate-200 px-3 py-2 font-semibold uppercase tracking-wide text-sky-900">
              Expense Category
            </th>
            <th className="min-w-[120px] border-b border-slate-200 px-3 py-2 font-semibold uppercase tracking-wide text-sky-900">
              GL Account
            </th>
            <th className="min-w-[180px] border-b border-slate-200 px-3 py-2 font-semibold uppercase tracking-wide text-sky-900">
              GL Account Name
            </th>
            <th className="min-w-[220px] border-b border-slate-200 px-3 py-2 font-semibold uppercase tracking-wide text-sky-900 border-r border-slate-200">
              Description
            </th>
            {visibleMetrics.map((metric, metricIdx) => (
              <Fragment key={metric}>
                {MONTH_LABELS.map((m, monthIdx) => (
                  <th
                    key={`${metric}-${m}`}
                    className={`min-w-[80px] border-b border-slate-200 px-3 py-2 text-right font-semibold uppercase tracking-wide text-sky-900 ${
                      metricIdx > 0 && monthIdx === 0 ? 'border-l-2 border-sky-200' : ''
                    }`}
                  >
                    {m}-{yearSuffix}
                  </th>
                ))}
                <th className="min-w-[100px] border-b border-slate-200 bg-sky-100 px-3 py-2 text-right font-semibold uppercase tracking-wide text-sky-900">
                  FY
                </th>
              </Fragment>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.origins.length === 0 ? (
            <tr>
              <td
                colSpan={totalColumnCount}
                className="px-3 py-10 text-center text-sm text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.origins.map((origin) => (
              <Fragment key={origin.originOffice}>
                {origin.departments.map((dept) => (
                  <Fragment key={`${origin.originOffice}::${dept.department}`}>
                    {dept.leaves.map((leaf, leafIdx) => (
                      <tr
                        key={`${origin.originOffice}::${dept.department}::${leafIdx}`}
                        className="text-slate-700 hover:bg-slate-50"
                      >
                        <td className="sticky left-0 z-10 bg-white border-b border-slate-100 px-3 py-1.5 text-slate-600 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.04)]">
                          {leafIdx === 0 ? origin.originOffice : ''}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-1.5 text-slate-600">
                          {leafIdx === 0 ? dept.department : ''}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-1.5">
                          {leaf.categoryKeyIndex}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-1.5">
                          {leaf.expenseCategory}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-1.5 font-mono">
                          {leaf.glAccountCode}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-1.5">
                          {leaf.glAccountName}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-1.5">
                          {leaf.description}
                        </td>
                        <MetricCellsRow
                          metrics={leaf.metrics}
                          visibleMetrics={visibleMetrics}
                        />
                      </tr>
                    ))}

                    {/* Department subtotal — label lives in the sticky col so it
                        stays readable while scrolling month values. */}
                    <tr className="bg-slate-50 font-semibold text-slate-800">
                      <td className="sticky left-0 z-10 bg-slate-50 border-y border-slate-200 px-3 py-2 uppercase tracking-wide text-[11px] text-slate-500 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.04)]">
                        <div className={`${STICKY_LABEL_WIDTH_CLASS} whitespace-normal break-words`}>
                          Subtotal — {dept.department}
                        </div>
                      </td>
                      <td colSpan={6} className="border-y border-slate-200" />
                      <MetricCellsRow
                        metrics={dept.subtotals}
                        visibleMetrics={visibleMetrics}
                        borderClassName="border-y border-slate-200"
                        fyCellClassName="border-y border-slate-200 bg-sky-100/60 px-3 py-2 text-right tabular-nums whitespace-nowrap text-slate-900"
                      />
                    </tr>
                  </Fragment>
                ))}

                {/* Origin office subtotal */}
                <tr className="bg-sky-50 font-bold text-slate-900">
                  <td className="sticky left-0 z-10 bg-sky-50 border-y-2 border-sky-200 px-3 py-2 uppercase tracking-wide text-[11px] text-sky-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.04)]">
                    <div className={`${STICKY_LABEL_WIDTH_CLASS} whitespace-normal break-words`}>
                      Total — {origin.originOffice}
                    </div>
                  </td>
                  <td colSpan={6} className="border-y-2 border-sky-200" />
                  <MetricCellsRow
                    metrics={origin.subtotals}
                    visibleMetrics={visibleMetrics}
                    borderClassName="border-y-2 border-sky-200"
                    fyCellClassName="border-y-2 border-sky-200 bg-sky-200/70 px-3 py-2 text-right tabular-nums whitespace-nowrap"
                  />
                </tr>
              </Fragment>
            ))
          )}
        </tbody>

        {data.origins.length > 0 && (
          <tfoot>
            <tr className="bg-slate-900 text-white font-bold">
              <td className="sticky left-0 z-10 bg-slate-900 px-3 py-2 uppercase tracking-wide text-[11px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.04)]">
                <div className={`${STICKY_LABEL_WIDTH_CLASS} whitespace-normal break-words`}>
                  Grand Total
                </div>
              </td>
              <td colSpan={6} className="bg-slate-900" />
              <MetricCellsRow
                metrics={data.grandTotals}
                visibleMetrics={visibleMetrics}
                borderClassName="border-t border-slate-700"
                dimEmpty={false}
                fyCellClassName="border-t border-slate-700 bg-slate-800 px-3 py-2 text-right tabular-nums whitespace-nowrap"
              />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
