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

function ApprovalPrintColumn({
  roleLabel,
  progress,
  stamp,
  isLastCol,
}: {
  roleLabel: string;
  progress: ApprovalStepProgress;
  stamp: StampDisplay;
  isLastCol: boolean;
}) {
  const colBorder = isLastCol ? '' : 'border-r border-gray-400';

  return (
    <div className={`flex min-w-0 flex-col text-center text-sm print:break-inside-avoid ${colBorder}`}>
      <div className="flex h-12 items-center justify-center border-b border-gray-400 px-2 py-1 text-[12px] font-medium leading-tight text-gray-800 line-clamp-2">
        {roleLabel}
      </div>
      <div className="flex h-14 items-center justify-center border-b border-gray-400 px-2 py-1.5 text-gray-700 text-[10px] line-clamp-3 leading-tight">
        {progress.actorName ?? <span className="text-gray-300">—</span>}
      </div>
      <div className="flex h-20 items-center justify-center border-b border-gray-400 px-2 py-4">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold tracking-narrow opacity-90 ${stamp.toneClass}`}
        >
          {stamp.label}
        </span>
      </div>
      <div className="flex h-8 items-center justify-center px-2 py-1 text-[8px] text-gray-500 line-clamp-2 leading-tight">
        {progress.timestampLabel}
      </div>
    </div>
  );
}

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

  const filledCount = levels.length + (showRequestorColumn ? 1 : 0);
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
          {showRequestorColumn && requestorStepProgress ? (
            <ApprovalPrintColumn
              roleLabel={requestorRoleLabel}
              progress={requestorStepProgress}
              stamp={getRequestorStamp(requestorStepProgress)}
              isLastCol={levels.length === 0}
            />
          ) : null}

          {levels.map((level, index) => {
            const progress = stepProgresses[index] ?? {
              statusLabel: 'Pending',
              timestampLabel: '-',
              actorName: null,
              note: null,
            };
            return (
              <ApprovalPrintColumn
                key={level.stepOrder}
                roleLabel={level.role?.roleName ?? '-'}
                progress={progress}
                stamp={getReviewerStamp(progress)}
                isLastCol={index === levels.length - 1}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
