'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';
import ApprovalStepNotesList from '@/components/approval/ApprovalStepNotesList';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import RichTextContent from '@/components/ui/RichTextContent';
import ApprovalEscalationPrintGrid from '@/components/approval/ApprovalEscalationPrintGrid';
import EntityCommentPanel from '@/components/comments/EntityCommentPanel';
import Button from '@/components/ui/Button';
import { isBudgetRequestCompactDetailView } from '@/lib/deployment-ui-policy';
import { Eye, PenSquare, Printer } from 'lucide-react';
import {
  getMultiStepApprovalProgress,
  getRequestorSubmissionStepProgress,
  getRequestStatusDisplay,
} from '@/lib/budget-plan-approval-display';

const usingCompactView = isBudgetRequestCompactDetailView();

type HistoryEntry = {
  id: string;
  action: string;
  timestamp: string;
  details: { status?: string; declineReason?: string; approvalNote?: string | null; qtyUnitPriceAdjustmentNote?: string | null } | null;
  user: { name: string | null } | null;
};

export default function ReviewBudgetRequestPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;
  const [data, setData] = useState<{
    id: string;
    code: string;
    subject: string;
    description: string | null;
    notes: string | null;
    status: string;
    requestDate: string;
    requestorName?: string | null;
    fiscalYear: number;
    vatAmount?: unknown;
    whtAmount?: unknown;
    invoiceAmount?: unknown;
    grandTotal?: unknown;
    canReview?: boolean;
    category?: string | null;
    categoryKeyIndex?: string | null;
    costCenter?: string | null;
    coa?: string | null;
    type?: string | null;
    opexAllocation?: string | null;
    budgetPlan: {
      code: string;
      subject: string;
      categoryId?: string | null;
      costCenterId?: string | null;
      categoryKeyIndexId?: string | null;
      coaId?: string | null;
      opexType?: string | null;
      opexAllocationId?: string | null;
      category?: { name: string } | null;
      costCenter?: { name: string } | null;
      categoryKeyIndex?: { name: string } | null;
      opexAllocation?: { name: string } | null;
      // Totals computed server-side, excluding this BR. The review page uses
      // them to render the plan's outstanding balance and the projected
      // balance if the reviewer approves this BR.
      allocationTotal?: number;
      realization?: number;
      outstanding?: number;
    };
    department: { name: string };
    lineItems: { item: string; qty: number; unitPrice: number; subtotal?: number; deduction?: number; total: number }[];
    approvalSchema?: {
      approvalLevels: { stepOrder: number; levelType: string; role: { roleName: string } | null }[];
    } | null;
    histories?: HistoryEntry[];
    accountOptions?: { id: string; accountCode: string; accountName: string }[];
    categoryOptions?: { id: string; name: string }[];
    categoryKeyIndexOptions?: { id: string; name: string }[];
    costCenterOptions?: { id: string; name: string }[];
    opexAllocationOptions?: { id: string; name: string }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [classification, setClassification] = useState({
    costCenterId: '',
    categoryId: '',
    categoryKeyIndexId: '',
    coaId: '',
    opexType: 'OPEX',
    opexAllocationId: '',
  });
  const [reviewLineItems, setReviewLineItems] = useState<
    { item: string; qty: number; unitPrice: number; deduction: number }[]
  >([]);

  useEffect(() => {
    fetch(`/api/budget-requests/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        setData(payload);
        if (!payload) return;
        setReviewLineItems(
          (payload.lineItems || []).map((lineItem: { item?: string; qty?: number; unitPrice?: number; deduction?: number }) => ({
            item: lineItem.item || '',
            qty: Number(lineItem.qty ?? 0),
            unitPrice: Number(lineItem.unitPrice ?? 0),
            deduction: Number(lineItem.deduction ?? 0),
          }))
        );
        setClassification({
          costCenterId: payload.costCenter || payload.budgetPlan?.costCenterId || '',
          categoryId: payload.category || payload.budgetPlan?.categoryId || '',
          categoryKeyIndexId: payload.categoryKeyIndex || payload.budgetPlan?.categoryKeyIndexId || '',
          coaId: payload.coa || payload.budgetPlan?.coaId || '',
          opexType: payload.opexType || payload.type || payload.budgetPlan?.opexType || 'OPEX',
          opexAllocationId: payload.opexAllocation || payload.budgetPlan?.opexAllocationId || '',
        });
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const closeDeclineModal = () => {
    setIsDeclineModalOpen(false);
    setDeclineReason('');
  };

  const closeApproveModal = () => {
    setIsApproveModalOpen(false);
    setApprovalNote('');
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/budget-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalNote: approvalNote.trim() || null,
          costCenterId: classification.costCenterId || null,
          categoryId: classification.categoryId || null,
          categoryKeyIndexId: classification.categoryKeyIndexId || null,
          coaId: classification.coaId || null,
          opexType: classification.opexType || null,
          opexAllocationId: classification.opexType === 'OPEX' ? classification.opexAllocationId || null : null,
          lineItems: reviewLineItems.map((lineItem) => ({
            item: lineItem.item,
            qty: lineItem.qty,
            unitPrice: lineItem.unitPrice,
            deduction: lineItem.deduction,
          })),
        }),
      });
      if (res.ok) {
        closeApproveModal();
        router.push(`/budget-requests/${id}`);
      } else alert('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async (mode: 'revision' | 'decline') => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/budget-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          declineReason: declineReason.trim() || null,
          costCenterId: classification.costCenterId || null,
          categoryId: classification.categoryId || null,
          categoryKeyIndexId: classification.categoryKeyIndexId || null,
          coaId: classification.coaId || null,
          opexType: classification.opexType || null,
          opexAllocationId: classification.opexType === 'OPEX' ? classification.opexAllocationId || null : null,
          lineItems: reviewLineItems.map((lineItem) => ({
            item: lineItem.item,
            qty: lineItem.qty,
            unitPrice: lineItem.unitPrice,
            deduction: lineItem.deduction,
          })),
        }),
      });
      if (res.ok) {
        setIsDeclineModalOpen(false);
        setDeclineReason('');
        router.push(`/budget-requests/${id}`);
      } else {
        alert('Failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;
  if (!data) return <div className="text-gray-600">Not found</div>;

  const transactionAmount = reviewLineItems.reduce(
    (sum, lineItem) => sum + Math.max(0, lineItem.qty * lineItem.unitPrice - lineItem.deduction),
    0
  );
  const vatPercent = Number((data as { vatPercent?: number }).vatPercent ?? 11);
  const whtPercent = Number((data as { whtPercent?: number }).whtPercent ?? 2);
  const vatAmount = Math.round(transactionAmount * (vatPercent / 100));
  const whtAmount = Math.round(transactionAmount * (whtPercent / 100));
  const invoiceAmount = transactionAmount + vatAmount;
  const grandTotal = invoiceAmount - whtAmount;

  // Budget Plan Status — totals are computed server-side excluding this BR
  // (see `app/api/budget-requests/[id]/route.ts`), so the projected
  // outstanding "if this BR is approved" is just `outstanding - grandTotal`,
  // and the same calculation also yields the actual current outstanding for
  // an already-Approved BR (because self was excluded from realization).
  const planAllocationTotal = Number(data.budgetPlan?.allocationTotal ?? 0);
  const planRealization = Number(data.budgetPlan?.realization ?? 0);
  const planOutstanding = Number(data.budgetPlan?.outstanding ?? 0);
  const projectedOutstanding = planOutstanding - grandTotal;
  const isOverbudget = projectedOutstanding < 0;
  // `canEditClassification` keeps its original meaning — "can edit the
  // review form including line items (qty / unit price)". Line items are
  // economic facts of the request, so they remain gated only by review
  // eligibility. The narrower Classification gate is layered on top.
  const canEditClassification = Boolean(data.canReview);
  const hasEditClassificationPermission = Boolean(
    session?.user?.access?.activityAccess?.editClassificationSection,
  );
  const canViewBudgetPlanSnapshot = Boolean(
    session?.user?.access?.activityAccess?.viewBudgetPlanSnapshotOnBudgetRequestReview,
  );
  const canEditClassificationFields = canEditClassification && hasEditClassificationPermission;
  const orderedLevels = [...(data.approvalSchema?.approvalLevels || [])].sort((a, b) => a.stepOrder - b.stepOrder);
  const stepProgresses = getMultiStepApprovalProgress(orderedLevels, data.histories ?? []);
  const requestorStepProgress = getRequestorSubmissionStepProgress(data.histories ?? [], {
    requestorName: data.requestorName,
    requestDate: data.requestDate,
  });
  const nextStepIndex = stepProgresses.findIndex(
    (step) => step.statusLabel !== 'Reviewed' && step.statusLabel !== 'Approved',
  );
  const isFinalApprovalStep =
    orderedLevels.length > 0 && nextStepIndex === orderedLevels.length - 1;

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const reviewPrintButton = (
    <Button
      type="button"
      variant="outline"
      onClick={handlePrint}
      className="inline-flex items-center gap-2"
      aria-label="Print budget request review"
    >
      <Printer className="h-4 w-4" aria-hidden />
      Print
    </Button>
  );

  const reviewModals = (
    <>
      <Modal
        isOpen={isDeclineModalOpen}
        onClose={closeDeclineModal}
        closeOnEscape={!isSubmitting}
        overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 m-0"
        panelClassName="w-full max-w-xl rounded-xl bg-white p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold">Decline Confirmation</h3>
        <p className="mt-2 text-sm text-gray-600">
          Do you want to decline this budget request? You may ask for revision.
        </p>
        <textarea
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
          placeholder="Write reason..."
          className="mt-4 h-28 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeDeclineModal}
            className="rounded-lg border border-gray-500 px-4 py-2 hover:bg-gray-50 cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleDecline('revision')}
            className="flex items-center gap-2 rounded-lg border border-gray-500 px-4 py-2 hover:bg-gray-50 cursor-pointer"
            disabled={isSubmitting}
          >
            <PenSquare className="h-4 w-4 text-gray-500" />
            Ask For Revision
          </button>
          <button
            type="button"
            onClick={() => handleDecline('decline')}
            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 cursor-pointer"
            disabled={isSubmitting}
          >
            Yes, I Decline
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isApproveModalOpen}
        onClose={closeApproveModal}
        closeOnEscape={!isSubmitting}
        overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 m-0"
        panelClassName="w-full max-w-xl rounded-xl bg-white p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold">Approval Confirmation</h3>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to approve this budget request?
        </p>
        <textarea
          value={approvalNote}
          onChange={(e) => setApprovalNote(e.target.value)}
          placeholder="Write approval note (optional)..."
          className="mt-4 h-28 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeApproveModal}
            className="rounded-lg border border-gray-500 px-4 py-2 hover:bg-gray-50 cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApprove}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Confirm Approval'}
          </button>
        </div>
      </Modal>
    </>
  );

  if (usingCompactView) {
    return (
      <>
        <div className="mx-auto flex w-full flex-col gap-6 xl:flex-row xl:items-start">
          <div className="mx-auto w-full space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
              <Link href={`/budget-requests/${id}`} className="text-blue-600 hover:underline">
                ← Back
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                {reviewPrintButton}
                <Link
                  href={`/budget-requests/${id}/review/detail`}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 h-10 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4" aria-hidden />
                  Detail
                </Link>
                {data.status !== 'Approved' ? (
                  <>
                    <Link
                      href={`/budget-requests/${id}`}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 h-10 text-sm font-medium text-gray-800 hover:bg-gray-50"
                    >
                      Cancel
                    </Link>
                    <button
                      type="button"
                      onClick={() => setIsDeclineModalOpen(true)}
                      disabled={isSubmitting || !data.canReview}
                      className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 h-10 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      title={!data.canReview ? 'You are not in current review step of this approval schema' : undefined}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsApproveModalOpen(true)}
                      disabled={isSubmitting || !data.canReview}
                      className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 h-10 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      title={!data.canReview ? 'You are not in current review step of this approval schema' : undefined}
                    >
                      {isSubmitting ? 'Submitting...' : isFinalApprovalStep ? 'Final approve' : 'Approve'}
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <Card className="space-y-4">
            <h3 className="font-medium">Approval Escalation</h3>
            {orderedLevels.length ? (
              <ApprovalEscalationPrintGrid
                levels={orderedLevels}
                stepProgresses={stepProgresses}
                showRequestor
                requestorStepProgress={requestorStepProgress}
              />
            ) : (
              <p className="text-sm text-gray-500">No approval escalation schema configured.</p>
            )}
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Request Date</p>
              <p className="text-base font-medium text-gray-900">{formatDate(data.requestDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Subject</p>
              <h1 className="text-2xl font-semibold text-gray-900">{data.subject}</h1>
            </div>
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <div className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <RichTextContent value={data.description} />
              </div>
            </div>
          </Card>
        </div>

        <aside className="sticky top-24 z-10 w-full shrink-0 self-start xl:w-96">
          <EntityCommentPanel
            entityBasePath="budget-requests"
            entityId={id}
            requestStatus={data.status}
            approvalLevels={orderedLevels}
            histories={data.histories ?? []}
            inputId="br-review-comment-input"
          />
        </aside>
        </div>
        {reviewModals}
      </>
    );
  }

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const reviewActionButtons =
    data.status !== 'Approved' ? (
      <div className="flex justify-end gap-3 pt-4 print:hidden">
        <Link href={`/budget-requests/${id}`} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => setIsDeclineModalOpen(true)}
          disabled={isSubmitting || !data.canReview}
          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          title={!data.canReview ? 'You are not in current review step of this approval schema' : undefined}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => setIsApproveModalOpen(true)}
          disabled={isSubmitting || !data.canReview}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          title={!data.canReview ? 'You are not in current review step of this approval schema' : undefined}
        >
          {isSubmitting ? 'Submitting...' : isFinalApprovalStep ? 'Final approve' : 'Approve'}
        </button>
      </div>
    ) : null;

  const reviewFormSections = (
    <>
      <Card collapsible header={<h3 className="font-medium">Items</h3>}>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Deduction</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableHeaderRow>
          </thead>
          <tbody>
            {reviewLineItems.map((li, i) => (
              <TableBodyRow key={`${li.item}-${i}`}>
                <TableCell>{li.item}</TableCell>
                <TableCell className="text-right">
                  {canEditClassification ? (
                    <Input
                      type="number"
                      min={0}
                      value={li.qty}
                      onChange={(e) =>
                        setReviewLineItems((previous) =>
                          previous.map((item, index) =>
                            index === i ? { ...item, qty: Number(e.target.value) || 0 } : item
                          )
                        )
                      }
                      className="max-w-[100px] text-right"
                    />
                  ) : (
                    li.qty
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canEditClassification ? (
                    <Input
                      type="number"
                      min={0}
                      value={li.unitPrice}
                      onChange={(e) =>
                        setReviewLineItems((previous) =>
                          previous.map((item, index) =>
                            index === i ? { ...item, unitPrice: Number(e.target.value) || 0 } : item
                          )
                        )
                      }
                      className="max-w-[160px] text-right"
                    />
                  ) : (
                    formatCurrency(Number(li.unitPrice ?? 0))
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(Number(li.unitPrice ?? 0) * li.qty)}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(li.deduction ?? 0))}</TableCell>
                <TableCell className="text-right">{formatCurrency(Math.max(0, Number(li.unitPrice ?? 0) * li.qty - Number(li.deduction ?? 0)))}</TableCell>
              </TableBodyRow>
            ))}
            <TableBodyRow className="bg-gray-50 font-medium">
              <TableCell colSpan={5} className="text-right">Transaction Amount</TableCell>
              <TableCell className="text-right">{formatCurrency(transactionAmount)}</TableCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableCell colSpan={5} className="text-right">VAT / PPN</TableCell>
              <TableCell className="text-right">{formatCurrency(vatAmount)}</TableCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableCell colSpan={5} className="text-right">Invoice Amount</TableCell>
              <TableCell className="text-right">{formatCurrency(invoiceAmount)}</TableCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableCell colSpan={5} className="text-right">WHT / PPh</TableCell>
              <TableCell className="text-right">({formatCurrency(whtAmount)})</TableCell>
            </TableBodyRow>
            <TableBodyRow className="bg-green-200/60 hover:bg-green-200/80 text-base font-semibold">
              <TableCell colSpan={5} className="text-right">Grandtotal</TableCell>
              <TableCell className="text-right">{formatCurrency(grandTotal)}</TableCell>
            </TableBodyRow>
          </tbody>
        </Table>
      </Card>

      {canViewBudgetPlanSnapshot ? (
        <Card
          className="space-y-3"
          header={<h3 className="font-medium">Budget Plan Status</h3>}
        >
          <p className="text-sm text-gray-500">
            Snapshot of plan <span className="font-medium text-gray-700">{data.budgetPlan?.code}</span>{' '}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-baseline justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-sm text-gray-600">Plan total</span>
              <span className="font-medium tabular-nums">{formatCurrency(planAllocationTotal)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-sm text-gray-600">Realized (other approved BRs)</span>
              <span className="font-medium tabular-nums">{formatCurrency(planRealization)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 rounded-lg bg-blue-50 px-3 py-2 ring-1 ring-blue-200">
              <span className="text-sm font-medium text-blue-700">Outstanding (available)</span>
              <span className="font-semibold tabular-nums text-blue-800">
                {formatCurrency(planOutstanding)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-sm text-gray-600">This request grand total</span>
              <span className="font-medium tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
          <div
            className={`flex items-baseline justify-between gap-3 rounded-lg px-3 py-2 ${
              isOverbudget
                ? 'bg-red-50 ring-1 ring-red-300'
                : 'bg-emerald-50 ring-1 ring-emerald-200'
            }`}
            role="status"
            aria-live="polite"
          >
            <span
              className={`text-sm font-medium ${
                isOverbudget ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {isOverbudget
                ? 'Outstanding after approval — over budget!'
                : 'Outstanding after approval'}
            </span>
            <span
              className={`font-semibold tabular-nums ${
                isOverbudget ? 'text-red-800' : 'text-emerald-800'
              }`}
            >
              {formatCurrency(projectedOutstanding)}
            </span>
          </div>
        </Card>
      ) : null}

      <Card collapsible header={<h3 className="font-medium">Classification</h3>}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block mb-1.5 text-sm font-medium">Cost Center</label>
              <Select
                value={classification.costCenterId}
                disabled={!canEditClassificationFields}
                onChange={(e) => setClassification((p) => ({ ...p, costCenterId: e.target.value }))}
              >
                <option value="">-</option>
                {(data.costCenterOptions || []).map((costCenter) => (
                  <option key={costCenter.id} value={costCenter.id}>
                    {costCenter.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium">Category</label>
              <Select
                value={classification.categoryId}
                disabled={!canEditClassificationFields}
                onChange={(e) => setClassification((p) => ({ ...p, categoryId: e.target.value }))}
              >
                <option value="">-</option>
                {(data.categoryOptions || []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium">Category Key Index</label>
              <Select
                value={classification.categoryKeyIndexId}
                disabled={!canEditClassificationFields}
                onChange={(e) => setClassification((p) => ({ ...p, categoryKeyIndexId: e.target.value }))}
              >
                <option value="">-</option>
                {(data.categoryKeyIndexOptions || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">  
            <div className="md:col-span-2">
              <label className="block mb-1.5 text-sm font-medium">Kode Akun</label>
              <Select
                value={classification.coaId}
                disabled={!canEditClassificationFields}
                onChange={(e) => setClassification((p) => ({ ...p, coaId: e.target.value }))}
              >
                <option value="">-</option>
                {(data.accountOptions || []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} - {account.accountName}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">  
            <div>
              <label className="block mb-1.5 text-sm font-medium">Type</label>
              <Select
                value={classification.opexType}
                disabled={!canEditClassificationFields}
                onChange={(e) =>
                  setClassification((p) => ({
                    ...p,
                    opexType: e.target.value,
                    opexAllocationId: e.target.value === 'OPEX' ? p.opexAllocationId : '',
                  }))
                }
              >
                <option value="OPEX">OPEX</option>
                <option value="CAPEX">CAPEX</option>
              </Select>
            </div>
            {classification.opexType === 'OPEX' ? (
              <div>
                <label className="block mb-1.5 text-sm font-medium">Opex Allocation</label>
                <Select
                  value={classification.opexAllocationId}
                  disabled={!canEditClassificationFields}
                  onChange={(e) => setClassification((p) => ({ ...p, opexAllocationId: e.target.value }))}
                >
                  <option value="">-</option>
                  {(data.opexAllocationOptions || []).map((allocation) => (
                    <option key={allocation.id} value={allocation.id}>
                      {allocation.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </>
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-col gap-2">
          <Link href={`/budget-requests/${id}`} className="text-blue-600 hover:underline">← Back</Link>
          <h1 className="text-2xl font-semibold">Review Budget Request</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">{reviewPrintButton}</div>
      </div>

      <Card className="space-y-4">
        <h3 className="font-medium">Header Information</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><span className="text-gray-500">ID:</span> {data.code}</div>
          <div><span className="text-gray-500">Request Date:</span> {formatDate(data.requestDate)}</div>
          <div><span className="text-gray-500">Budget Plan:</span> {data.budgetPlan?.code} - {data.budgetPlan?.subject}</div>
          <div><span className="text-gray-500">Department:</span> {data.department?.name ?? '-'}</div>
          <div><span className="text-gray-500">Fiscal Year:</span> {data.fiscalYear}</div>
          <div>
            <span className="text-gray-500">Status:</span>{' '}
            {(() => {
              const display = getRequestStatusDisplay(data.status);
              return (
                <span className={`rounded px-2 py-0.5 text-sm ${display.chipClass}`}>
                  {display.label}
                </span>
              );
            })()}
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Subject:</span>
            <p className="font-medium">{data.subject}</p>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Description:</span>
            <RichTextContent value={data.description} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Notes:</span>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{data.notes || '-'}</p>
          </div>
        </div>
      </Card>

      {reviewFormSections}

      <div>
        {orderedLevels.length ? (
          <Card collapsible header={<h3 className="font-medium">Approval Escalation</h3>}>
            <Table>
              <thead>
                <TableHeaderRow>
                  <TableHead>#</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated At</TableHead>
                </TableHeaderRow>
              </thead>
              <tbody>
                {orderedLevels.map((level, index) => {
                  const stepProgress = stepProgresses[index];
                  const stepStatusLabel = stepProgress.statusLabel;
                  return (
                    <TableBodyRow key={level.stepOrder}>
                      <TableCell>{level.stepOrder}</TableCell>
                      <TableCell>{level.role?.roleName ?? '-'}</TableCell>
                      <TableCell>{level.levelType}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            stepStatusLabel === 'Reviewed' || stepStatusLabel === 'Approved'
                              ? 'bg-green-100 text-green-800'
                              : stepStatusLabel === 'Revision'
                                ? 'bg-amber-100 text-amber-800'
                                : stepStatusLabel === 'Declined'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {stepStatusLabel}
                        </span>
                      </TableCell>
                      <TableCell>{stepProgress.timestampLabel}</TableCell>
                    </TableBodyRow>
                  );
                })}
              </tbody>
            </Table>

            <ApprovalStepNotesList levels={orderedLevels} stepProgresses={stepProgresses} />

            {reviewActionButtons}
          </Card>
        ) : null}
      </div>

      <Card collapsible header={<h3 className="font-medium">Budget Request History</h3>}>
        {data.histories?.length ? (
          <div className="space-y-2">
            {data.histories.map((history) => (
              <div key={history.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                <p>
                  <span className="font-medium">{history.user?.name || 'Unknown User'}</span>{' '}
                  <span className="text-gray-700">{history.action.toLowerCase()}</span>{' '}
                  <span className="text-gray-500">on {formatDateTime(history.timestamp)}</span>
                </p>
                {history.details?.status ? <p className="text-gray-600">Status: {history.details.status}</p> : null}
                {history.details?.declineReason ? <p className="text-gray-600">Reason: {history.details.declineReason}</p> : null}
                {history.details?.approvalNote ? <p className="text-gray-600">Note: {history.details.approvalNote}</p> : null}
                {history.details?.qtyUnitPriceAdjustmentNote ? (
                  <p className="text-amber-700">{history.details.qtyUnitPriceAdjustmentNote}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No history yet.</p>
        )}
      </Card>
      {reviewModals}
    </div>
  );
}
