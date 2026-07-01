'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import LoadingSpin from '@/components/ui/LoadingSpin';
import BudgetRequestReviewWorkspace from '@/components/budget-requests/BudgetRequestReviewWorkspace';
import EntityCommentPanel from '@/components/comments/EntityCommentPanel';
import { formatBudgetRequestOriginOfficeLabel } from '@/lib/budget-requests/display';
import { isBudgetRequestCompactDetailView } from '@/lib/deployment-ui-policy';
import {
  getMultiStepApprovalProgress,
  type BudgetPlanHistoryEntry,
} from '@/lib/budget-plan-approval-display';
import type { BudgetRequestReviewData } from '@/components/budget-requests/BudgetRequestReviewWorkspace';

const compactDetailEnabled = isBudgetRequestCompactDetailView();

type HistoryEntry = BudgetPlanHistoryEntry;

export default function BudgetRequestReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<(BudgetRequestReviewData & {
    approvalSchema?: {
      approvalLevels: { stepOrder: number; levelType: string; role: { roleName: string } | null }[];
    } | null;
    histories?: HistoryEntry[];
    originOffices?: { code: string; name: string; isActive: boolean }[];
  }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!compactDetailEnabled) {
      router.replace(`/budget-requests/${id}/review`);
    }
  }, [id, router]);

  useEffect(() => {
    if (!compactDetailEnabled) return;
    fetch(`/api/budget-requests/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (!compactDetailEnabled) return <LoadingSpin />;
  if (isLoading) return <LoadingSpin />;
  if (!data) return <div className="text-gray-600">Not found</div>;

  const orderedLevels = [...(data.approvalSchema?.approvalLevels ?? [])].sort(
    (a, b) => a.stepOrder - b.stepOrder,
  );
  const stepProgresses = getMultiStepApprovalProgress(orderedLevels, data.histories ?? []);
  const nextStepIndex = stepProgresses.findIndex(
    (step) => step.statusLabel !== 'Reviewed' && step.statusLabel !== 'Approved',
  );
  const isFinalApprovalStep =
    orderedLevels.length > 0 && nextStepIndex === orderedLevels.length - 1;

  const originOfficeLabel = formatBudgetRequestOriginOfficeLabel(data, data.originOffices);

  return (
    <div className="mx-auto flex w-full flex-col gap-6 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-6">
        <Link href={`/budget-requests/${id}/review`} className="text-blue-600 hover:underline">
          ← Back
        </Link>

        <BudgetRequestReviewWorkspace
          id={id}
          data={data}
          originOfficeLabel={originOfficeLabel}
          cancelHref={`/budget-requests/${id}/review`}
          successRedirectHref={`/budget-requests/${id}`}
          isFinalApprovalStep={isFinalApprovalStep}
        />
      </div>

      <aside className="sticky top-24 z-10 w-full shrink-0 self-start xl:w-96">
        <EntityCommentPanel
          entityBasePath="budget-requests"
          entityId={id}
          requestStatus={data.status}
          approvalLevels={orderedLevels}
          histories={data.histories ?? []}
          inputId="br-review-detail-comment-input"
        />
      </aside>
    </div>
  );
}
