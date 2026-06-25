import type { ApprovalStepProgress } from '@/lib/budget-plan-approval-display';

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
  const colBorder = isLastCol ? '' : 'border-r border-gray-300';

  return (
    <div className={`flex flex-col text-center text-sm print:break-inside-avoid ${colBorder}`}>
      <div className="flex min-h-[3.5rem] items-center justify-center border-b border-gray-300 px-2 py-2 font-medium text-gray-800">
        {roleLabel}
      </div>
      <div className="flex min-h-[3.5rem] items-center justify-center border-b border-gray-300 px-2 py-2 text-gray-700">
        {progress.actorName ?? <span className="text-gray-300">—</span>}
      </div>
      <div className="flex min-h-[4rem] items-center justify-center border-b border-gray-300 px-2 py-2">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold tracking-narrow opacity-90 ${stamp.toneClass}`}
        >
          {stamp.label}
        </span>
      </div>
      <div className="flex min-h-[2.5rem] items-center justify-center px-2 py-2 text-xs text-gray-500">
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
  if (!levels.length && !showRequestor) return null;

  const columnCount = levels.length + (showRequestor ? 1 : 0);

  return (
    <div className={`overflow-x-auto -mx-2 px-2 print:overflow-visible print:mx-0 print:px-0 ${className}`}>
      <div
        className="grid min-w-full overflow-hidden rounded-lg border border-gray-300 bg-white"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(140px, 1fr))`,
        }}
      >
        {showRequestor && requestorStepProgress ? (
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
  );
}
