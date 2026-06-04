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
  user: { name: string };
};

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
  statusLabel: string;
  timestampLabel: string;
  actorName: string | null;
};

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
