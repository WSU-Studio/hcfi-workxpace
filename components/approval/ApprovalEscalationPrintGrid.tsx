import type { ApprovalStepProgress } from '@/lib/budget-plan-approval-display';

/** Print layout reserves this many equal column slots across the page width. */
// use filledCount as default if the number of columns is not known and to be set as full page
const PRINT_COLUMN_SLOTS = 9;

export type ApprovalEscalationPrintLevel = {
  stepOrder: number;
  role?: { roleName: string } | null;
};

export type ApprovalEscalationPrintGridProps = {
  levels: ApprovalEscalationPrintLevel[];
  stepProgresses: ApprovalStepProgress[];
  /** When true, renders a leading Requestor column before reviewer/approver steps. */
  showRequestor?: boolean;
  requestorStepProgress?: ApprovalStepProgress | null;
  requestorRoleLabel?: string;
  className?: string;
};

type StampDisplay = {
  label: string;
  toneClass: string;
};

type PrintColumnModel = {
  key: string;
  roleLabel: string;
  progress: ApprovalStepProgress;
  stamp: StampDisplay;
  isLastCol: boolean;
};

function getRequestorStamp(progress: ApprovalStepProgress): StampDisplay {
  if (progress.statusLabel === 'Submitted') {
    return { label: 'Submit', toneClass: 'border-2 border-blue-400 text-blue-500' };
  }
  return { label: '', toneClass: '' };
}

function getReviewerStamp(progress: ApprovalStepProgress): StampDisplay {
  const isApproved = progress.statusLabel === 'Approved' || progress.statusLabel === 'Reviewed';
  if (isApproved) {
    return { label: 'Accept', toneClass: 'border-2 border-blue-400 text-blue-500' };
  }
  return { label: '', toneClass: '' };
}

/**
 * Row-major cells so every column shares the same row height (role / name /
 * stamp / date). Avoids per-column `h-14` + line-clamp that truncates
 * "on behalf of" names while keeping the grid aligned.
 */
export default function ApprovalEscalationPrintGrid({
  levels,
  stepProgresses,
  showRequestor = false,
  requestorStepProgress = null,
  requestorRoleLabel = 'Requestor',
  className = '',
}: ApprovalEscalationPrintGridProps) {
  const showRequestorColumn = Boolean(showRequestor && requestorStepProgress);
  if (!levels.length && !showRequestorColumn) return null;

  const columns: PrintColumnModel[] = [];
  if (showRequestorColumn && requestorStepProgress) {
    columns.push({
      key: 'requestor',
      roleLabel: requestorRoleLabel,
      progress: requestorStepProgress,
      stamp: getRequestorStamp(requestorStepProgress),
      isLastCol: levels.length === 0,
    });
  }
  levels.forEach((level, index) => {
    const progress = stepProgresses[index] ?? {
      statusLabel: 'Pending',
      timestampLabel: '-',
      actorName: null,
      note: null,
      displayRoleName: null,
    };
    columns.push({
      key: `step-${level.stepOrder}`,
      roleLabel: progress.displayRoleName?.trim() || level.role?.roleName || '-',
      progress,
      stamp: getReviewerStamp(progress),
      isLastCol: index === levels.length - 1,
    });
  });

  const filledCount = columns.length;
  // Each filled column occupies 1/9 of the page; unused slots stay empty to the right.
  const widthPercent = Math.min(filledCount / PRINT_COLUMN_SLOTS, 1) * 100;
  const sideLabelWidthRem = 1.75;

  return (
    <div className={`overflow-x-auto -mx-2 px-2 print:overflow-visible print:mx-0 print:px-0 ${className}`}>
      <div
        className="flex max-w-full overflow-hidden rounded-lg border border-gray-400 bg-white print:rounded-none"
        style={{
          width: `min(100%, calc(${widthPercent}% + ${sideLabelWidthRem}rem))`,
        }}
      >
        <div
          className="hidden print:flex shrink-0 items-center justify-center self-stretch border-r border-gray-400"
          style={{ width: `${sideLabelWidthRem}rem` }}
          aria-hidden
        >
          <span className="-rotate-90 whitespace-nowrap text-xs font-semibold tracking-wide text-gray-800">
            Approval
          </span>
        </div>

        <div
          className="grid min-w-0 flex-1"
          style={{
            gridTemplateColumns: `repeat(${filledCount}, minmax(0, 1fr))`,
          }}
        >
          {columns.map((col) => {
            const colBorder = col.isLastCol ? '' : 'border-r border-gray-400';
            return (
              <div
                key={`role-${col.key}`}
                className={`flex min-h-12 items-center justify-center border-b border-gray-400 px-2 py-1 text-center text-[12px] font-medium leading-tight text-gray-800 ${colBorder}`}
              >
                {col.roleLabel}
              </div>
            );
          })}

          {columns.map((col) => {
            const colBorder = col.isLastCol ? '' : 'border-r border-gray-400';
            return (
              <div
                key={`actor-${col.key}`}
                className={`flex min-h-14 items-center justify-center border-b border-gray-400 px-2 py-1.5 text-center text-[10px] leading-tight text-gray-700 whitespace-pre-line ${colBorder}`}
              >
                {col.progress.actorName ?? <span className="text-gray-300">—</span>}
              </div>
            );
          })}

          {columns.map((col) => {
            const colBorder = col.isLastCol ? '' : 'border-r border-gray-400';
            return (
              <div
                key={`stamp-${col.key}`}
                className={`flex h-20 items-center justify-center border-b border-gray-400 px-2 py-4 ${colBorder}`}
              >
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold tracking-narrow opacity-90 ${col.stamp.toneClass}`}
                >
                  {col.stamp.label}
                </span>
              </div>
            );
          })}

          {columns.map((col) => {
            const colBorder = col.isLastCol ? '' : 'border-r border-gray-400';
            return (
              <div
                key={`time-${col.key}`}
                className={`flex h-8 items-center justify-center px-2 py-1 text-center text-[8px] leading-tight text-gray-500 ${colBorder}`}
              >
                {col.progress.timestampLabel}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
