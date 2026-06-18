export type BudgetPlanHistoryEntry = {
  id: string;
  action: string;
  details: {
    status?: string;
    declineReason?: string | null;
    allocationAdjustmentNote?: string | null;
    currentState?: { allocationAdjustmentNote?: string | null } | null;
  } | null;
  timestamp: string;
  // Sengaja dilonggarkan: history mungkin punya user `null` (sistem) atau
  // `name` `null` (akun di-soft-delete). Helper sudah handle via optional
  // chaining; type ini juga dipakai oleh budget-request detail page.
  user: { name: string | null } | null;
};

export type ApprovalStepStatus =
  | 'Pending'
  | 'Reviewed'
  | 'Approved'
  | 'Revision'
  | 'Declined'
  | 'Processed';

function getHistoryStatus(history: BudgetPlanHistoryEntry): string | null {
  if (!history.details) return null;
  if (typeof history.details.status === 'string' && history.details.status.length > 0) return history.details.status;
  const currentState = history.details.currentState;
  if (
    currentState &&
    typeof currentState === 'object' &&
    'status' in currentState &&
    typeof currentState.status === 'string' &&
    currentState.status.length > 0
  ) {
    return currentState.status;
  }
  return null;
}

export function formatBudgetPlanHistoryDateTime(date: string): string {
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export type ApprovalStepProgress = {
  statusLabel: ApprovalStepStatus | string;
  timestampLabel: string;
  actorName: string | null;
};

export type RequestStatusDisplay = {
  /** User-facing label, e.g. "On Progress", "Need Revision". */
  label: string;
  /** Tailwind classes for the chip background + text color. */
  chipClass: string;
};

/**
 * Map the raw DB request status (BR/PR/BP share the same vocabulary) to a
 * user-friendly chip label + tone. Used wherever an entity's *overall*
 * status chip is rendered — listings, detail headers, review pages.
 *
 * Semantics:
 *   - Draft     → "Draft" (gray)          — not yet submitted
 *   - Pending   → "On Progress" (blue)    — submitted, system processing
 *   - Reviewed  → "On Progress" (blue)    — partially through approval ladder
 *   - Revision  → "Need Revision" (amber) — requestor needs to edit & resubmit
 *   - Declined  → "Declined" (red)        — terminal-negative
 *   - Approved  → "Approved" (green)      — terminal-positive
 *
 * Unknown statuses fall back to gray + the raw string so we never silently
 * hide a status the UI doesn't recognise yet.
 */
export function getRequestStatusDisplay(status: string): RequestStatusDisplay {
  switch (status) {
    case 'Approved':
      return { label: 'Approved', chipClass: 'bg-green-100 text-green-800 border-green-200' };
    case 'Pending':
    case 'Reviewed':
      return { label: 'On Progress', chipClass: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'Revision':
      return { label: 'Need Revision', chipClass: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'Declined':
      return { label: 'Declined', chipClass: 'bg-red-100 text-red-800 border-red-200' };
    case 'Draft':
      return { label: 'Draft', chipClass: 'bg-gray-100 text-gray-700 border-gray-200' };
    default:
      return { label: status || '-', chipClass: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
}

type ScannedCycle = {
  /** Histories that completed an approval step (Reviewed / Approved), in ASC order. */
  completedActions: BudgetPlanHistoryEntry[];
  /** The latest Revision / Declined event, if it terminates the current cycle. */
  interruptedAction: BudgetPlanHistoryEntry | null;
};

/**
 * Walk the history and return the events that belong to the *current* approval
 * cycle — i.e. everything that happened after the latest moment the requestor
 * (re)submitted the doc and landed it back on `Draft`. Used by the display
 * helper and by the review-eligibility helpers so they share one source of
 * truth about "where are we in the workflow right now".
 */
function scanCurrentCycle(histories: BudgetPlanHistoryEntry[]): ScannedCycle {
  const sortedAsc = histories
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // The cycle reset boundary is the latest `Draft` status logged. Detection by
  // status (rather than action name) keeps one rule that works across BR, PR,
  // and BP — including BP, where the action label `update` is overloaded for
  // both requestor edits AND reviewer-triggered Revision / Declined events.
  let resetIdx = -1;
  for (let i = sortedAsc.length - 1; i >= 0; i--) {
    if (getHistoryStatus(sortedAsc[i]) === 'Draft') {
      resetIdx = i;
      break;
    }
  }
  const scoped = resetIdx >= 0 ? sortedAsc.slice(resetIdx + 1) : sortedAsc;

  const completedActions: BudgetPlanHistoryEntry[] = [];
  let interruptedAction: BudgetPlanHistoryEntry | null = null;
  for (const history of scoped) {
    const status = getHistoryStatus(history);
    if (status === 'Reviewed' || status === 'Approved') {
      completedActions.push(history);
    } else if (status === 'Revision' || status === 'Declined') {
      interruptedAction = history;
      // Any further completing events after a revision/decline only make
      // sense once the requestor resubmits, which moves the reset boundary
      // above this point — so stop scanning the current cycle here.
      break;
    }
  }
  return { completedActions, interruptedAction };
}

/**
 * Number of approval steps already completed in the current cycle.
 * Used by the review-eligibility helpers to know which level is up next.
 */
export function countCompletedApprovalSteps(histories: BudgetPlanHistoryEntry[]): number {
  return scanCurrentCycle(histories).completedActions.length;
}

/**
 * Derive per-step approval state for a multi-step schema (e.g. 3-step or
 * 4-step ladders) from the entity's activity history.
 *
 * Behaviour we care about:
 *   - Each completed Reviewer/Approver step is matched to the n-th `approve`
 *     action that resulted in `Reviewed` / `Approved` — so step 1 keeps its
 *     "Reviewed" stamp even after step 2 also gets approved.
 *   - If the request is currently in `Revision` / `Declined`, the step where
 *     that happened keeps the "Revision" / "Declined" label (instead of
 *     reverting to "Pending"). Previously completed steps stay completed.
 *   - When the requestor resubmits, a new `create` / `update` activity is
 *     logged. Anything strictly before that boundary is considered a prior
 *     cycle and the table resets to a blank slate.
 */
export function getMultiStepApprovalProgress(
  orderedLevels: { stepOrder: number; levelType: string }[],
  histories: BudgetPlanHistoryEntry[]
): ApprovalStepProgress[] {
  const pending: ApprovalStepProgress = { statusLabel: 'Pending', timestampLabel: '-', actorName: null };
  const empty = orderedLevels.map(() => ({ ...pending }));
  if (!orderedLevels.length) return empty;

  const { completedActions, interruptedAction } = scanCurrentCycle(histories);

  return orderedLevels.map((level, index) => {
    const completed = completedActions[index];
    if (completed) {
      return {
        statusLabel: level.levelType === 'Reviewer' ? 'Reviewed' : 'Approved',
        timestampLabel: formatBudgetPlanHistoryDateTime(completed.timestamp),
        actorName: completed.user?.name ?? null,
      };
    }
    if (interruptedAction && index === completedActions.length) {
      const status = (getHistoryStatus(interruptedAction) || 'Processed') as ApprovalStepStatus;
      return {
        statusLabel: status,
        timestampLabel: formatBudgetPlanHistoryDateTime(interruptedAction.timestamp),
        actorName: interruptedAction.user?.name ?? null,
      };
    }
    return { ...pending };
  });
}

/** Derives per-step status for the approval escalation table from activity history. */
export function getApprovalStepProgress(
  levelType: string,
  histories: BudgetPlanHistoryEntry[]
): ApprovalStepProgress {
  const latestDraftReset = histories.find((history) => getHistoryStatus(history) === 'Draft');
  const scopedHistories = latestDraftReset
    ? histories.filter((history) => new Date(history.timestamp) > new Date(latestDraftReset.timestamp))
    : histories;

  const reviewedAt = scopedHistories.find((history) => getHistoryStatus(history) === 'Reviewed');
  const hasReviewedStep = !!reviewedAt;

  if (levelType === 'Reviewer') {
    const reviewerHistory = scopedHistories.find((history) => {
      const status = getHistoryStatus(history);
      return status ? ['Reviewed', 'Revision', 'Declined'].includes(status) : false;
    });
    if (!reviewerHistory) {
      return { statusLabel: 'Pending', timestampLabel: '-', actorName: null };
    }

    const reviewerStatus = getHistoryStatus(reviewerHistory) || 'Processed';
    return {
      statusLabel: reviewerStatus,
      timestampLabel: formatBudgetPlanHistoryDateTime(reviewerHistory.timestamp),
      actorName: reviewerHistory.user?.name ?? null,
    };
  }

  const approverHistory = scopedHistories.find((history) => {
    const status = getHistoryStatus(history) || '';
    if (status === 'Approved') return true;
    if (!['Revision', 'Declined'].includes(status)) return false;
    return hasReviewedStep && reviewedAt && new Date(history.timestamp) > new Date(reviewedAt.timestamp);
  });

  if (!approverHistory) {
    return { statusLabel: 'Pending', timestampLabel: '-', actorName: null };
  }
  const approverStatus = getHistoryStatus(approverHistory) || 'Processed';
  return {
    statusLabel: approverStatus,
    timestampLabel: formatBudgetPlanHistoryDateTime(approverHistory.timestamp),
    actorName: approverHistory.user?.name ?? null,
  };
}
