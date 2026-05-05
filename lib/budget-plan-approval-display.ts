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

export function formatBudgetPlanHistoryDateTime(date: string): string {
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Derives per-step status for the approval escalation table from activity history. */
export function getApprovalStepProgress(
  levelType: string,
  histories: BudgetPlanHistoryEntry[]
): { statusLabel: string; timestampLabel: string } {
  const latestDraftReset = histories.find((history) => history.details?.status === 'Draft');
  const scopedHistories = latestDraftReset
    ? histories.filter((history) => new Date(history.timestamp) > new Date(latestDraftReset.timestamp))
    : histories;

  const reviewedAt = scopedHistories.find((history) => history.details?.status === 'Reviewed');
  const hasReviewedStep = !!reviewedAt;

  if (levelType === 'Reviewer') {
    const reviewerHistory = scopedHistories.find((history) =>
      ['Reviewed', 'Revision', 'Declined'].includes(history.details?.status || '')
    );
    if (!reviewerHistory) return { statusLabel: 'Pending', timestampLabel: '-' };

    return {
      statusLabel: reviewerHistory.details?.status || 'Processed',
      timestampLabel: formatBudgetPlanHistoryDateTime(reviewerHistory.timestamp),
    };
  }

  const approverHistory = scopedHistories.find((history) => {
    const status = history.details?.status || '';
    if (status === 'Approved') return true;
    if (!['Revision', 'Declined'].includes(status)) return false;
    return hasReviewedStep && reviewedAt && new Date(history.timestamp) > new Date(reviewedAt.timestamp);
  });

  if (!approverHistory) return { statusLabel: 'Pending', timestampLabel: '-' };
  return {
    statusLabel: approverHistory.details?.status || 'Processed',
    timestampLabel: formatBudgetPlanHistoryDateTime(approverHistory.timestamp),
  };
}
