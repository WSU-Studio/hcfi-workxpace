'use client';

import EntityCommentPanel, { type EntityCommentPanelProps } from '@/components/comments/EntityCommentPanel';
import type { BudgetPlanHistoryEntry } from '@/lib/budget-plan-approval-display';

type ApprovalLevel = {
  stepOrder: number;
  levelType: string;
  role: { roleName: string } | null;
};

interface BudgetPlanCommentPanelProps {
  budgetPlanId: string;
  planStatus: string;
  approvalLevels?: ApprovalLevel[];
  histories?: BudgetPlanHistoryEntry[];
}

export default function BudgetPlanCommentPanel({
  budgetPlanId,
  planStatus,
  approvalLevels,
  histories,
}: BudgetPlanCommentPanelProps) {
  const props: EntityCommentPanelProps = {
    entityBasePath: 'budget-plans',
    entityId: budgetPlanId,
    requestStatus: planStatus,
    approvalLevels,
    histories,
    inputId: 'bp-comment-input',
  };

  return <EntityCommentPanel {...props} />;
}
