'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import LoadingSpin from '@/components/ui/LoadingSpin';
import BudgetRequestExpandedDetailView from '@/components/budget-requests/BudgetRequestExpandedDetailView';
import EntityCommentPanel from '@/components/comments/EntityCommentPanel';
import { formatBudgetRequestOriginOfficeLabel } from '@/lib/budget-requests/display';
import { isBudgetRequestCompactDetailView } from '@/lib/deployment-ui-policy';
import { getMultiStepApprovalProgress } from '@/lib/budget-plan-approval-display';

type HistoryEntry = {
  id: string;
  action: string;
  timestamp: string;
  details: {
    status?: string;
    declineReason?: string;
    approvalNote?: string | null;
    qtyUnitPriceAdjustmentNote?: string | null;
  } | null;
  user: { name: string | null } | null;
};

type BudgetRequestDetailApi = {
  id: string;
  code: string;
  subject: string;
  description: string | null;
  notes: string | null;
  requestDate: string;
  requestorName?: string | null;
  fiscalYear: number;
  status: string;
  vatAmount?: number;
  whtAmount?: number;
  invoiceAmount?: number;
  grandTotal?: number;
  originOffice?: string | null;
  project?: { name: string } | null;
  budgetPlan?: {
    code: string;
    subject: string;
    coaId?: string | null;
    opexType?: string | null;
    originOffice?: string | null;
    project?: { name: string } | null;
    category?: { name: string } | null;
    costCenter?: { name: string } | null;
    categoryKeyIndex?: { name: string } | null;
    opexAllocation?: { name: string } | null;
  } | null;
  department: { name: string };
  lineItems: {
    item: string;
    qty: number;
    unitPrice: number;
    subtotal?: number;
    deduction?: number;
    total: number;
  }[];
  allocations?: { year: number; month: number; allocation: number }[];
  accountOptions?: { id: string; accountCode: string; accountName: string }[];
  originOffices?: { code: string; name: string; isActive: boolean }[];
  approvalSchema?: {
    approvalLevels: { stepOrder: number; levelType: string; role: { roleName: string } | null }[];
  } | null;
  histories?: HistoryEntry[];
};

const compactDetailEnabled = isBudgetRequestCompactDetailView();

export default function BudgetRequestExpandedDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<BudgetRequestDetailApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!compactDetailEnabled) {
      router.replace(`/budget-requests/${id}`);
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

  const transactionAmount = data.lineItems?.reduce((s, l) => s + Number(l.total ?? 0), 0) ?? 0;
  const vatAmount = Number(data.vatAmount ?? 0);
  const whtAmount = Number(data.whtAmount ?? 0);
  const invoiceAmount = Number(data.invoiceAmount ?? transactionAmount + vatAmount);
  const transactionGrandTotal = invoiceAmount - whtAmount;
  const monthCount = Array.from(
    new Set((data.allocations ?? []).map((a) => a.month).filter((m) => m >= 1 && m <= 12)),
  ).length;

  const accountLabel = (() => {
    const coaId = data.budgetPlan?.coaId;
    if (!coaId) return '-';
    const account = data.accountOptions?.find((item) => item.id === coaId);
    return account ? `${account.accountCode} - ${account.accountName}` : coaId;
  })();

  const opexType = data.budgetPlan?.opexType || '-';

  const originOfficeLabel = formatBudgetRequestOriginOfficeLabel(data, data.originOffices);

  const orderedLevels = [...(data.approvalSchema?.approvalLevels ?? [])].sort(
    (a, b) => a.stepOrder - b.stepOrder,
  );
  const stepProgresses = getMultiStepApprovalProgress(orderedLevels, data.histories ?? []);

  return (
    <div className="mx-auto flex w-full flex-col gap-6 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-6">
        <Link href={`/budget-requests/${id}`} className="text-blue-600 hover:underline">
          ← Back
        </Link>

        <BudgetRequestExpandedDetailView
          data={data}
          originOfficeLabel={originOfficeLabel}
          accountLabel={accountLabel}
          opexType={opexType}
          monthCount={monthCount}
          totals={{
            transactionAmount,
            vatAmount,
            whtAmount,
            invoiceAmount,
            grandTotal: transactionGrandTotal,
          }}
          orderedLevels={orderedLevels}
          stepProgresses={stepProgresses}
        />
      </div>

      <aside className="sticky top-24 z-10 w-full shrink-0 self-start xl:w-96">
        <EntityCommentPanel
          entityBasePath="budget-requests"
          entityId={id}
          requestStatus={data.status}
          approvalLevels={orderedLevels}
          histories={data.histories ?? []}
          inputId="br-detail-comment-input"
        />
      </aside>
    </div>
  );
}
