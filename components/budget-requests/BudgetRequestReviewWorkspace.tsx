'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { BudgetRequestDetailSummarySection } from '@/components/budget-requests/BudgetRequestDetailSections';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';
import { PenSquare } from 'lucide-react';

export type BudgetRequestReviewLineItem = {
  item: string;
  qty: number;
  unitPrice: number;
  deduction: number;
};

export type BudgetRequestReviewClassification = {
  costCenterId: string;
  categoryId: string;
  categoryKeyIndexId: string;
  coaId: string;
  opexType: string;
  opexAllocationId: string;
};

export type BudgetRequestReviewData = {
  id: string;
  code: string;
  subject: string;
  description: string | null;
  notes: string | null;
  requestDate: string;
  requestorName?: string | null;
  fiscalYear: number;
  status: string;
  canReview?: boolean;
  category?: string | null;
  categoryKeyIndex?: string | null;
  costCenter?: string | null;
  coa?: string | null;
  type?: string | null;
  opexAllocation?: string | null;
  opexType?: string | null;
  department: { name: string };
  budgetPlan: {
    code: string;
    subject: string;
    categoryId?: string | null;
    costCenterId?: string | null;
    categoryKeyIndexId?: string | null;
    coaId?: string | null;
    opexType?: string | null;
    opexAllocationId?: string | null;
    originOffice?: string | null;
    project?: { name: string } | null;
    category?: { name: string } | null;
    costCenter?: { name: string } | null;
    categoryKeyIndex?: { name: string } | null;
    opexAllocation?: { name: string } | null;
    allocationTotal?: number;
    realization?: number;
    outstanding?: number;
  };
  lineItems: { item: string; qty: number; unitPrice: number; deduction?: number; total?: number }[];
  accountOptions?: { id: string; accountCode: string; accountName: string }[];
  categoryOptions?: { id: string; name: string }[];
  categoryKeyIndexOptions?: { id: string; name: string }[];
  costCenterOptions?: { id: string; name: string }[];
  opexAllocationOptions?: { id: string; name: string }[];
};

type BudgetRequestReviewWorkspaceProps = {
  id: string;
  data: BudgetRequestReviewData;
  originOfficeLabel: string;
  cancelHref: string;
  successRedirectHref: string;
  isFinalApprovalStep: boolean;
  showActionButtons?: boolean;
};

export function buildReviewLineItems(
  lineItems: BudgetRequestReviewData['lineItems'],
): BudgetRequestReviewLineItem[] {
  return (lineItems || []).map((lineItem) => ({
    item: lineItem.item || '',
    qty: Number(lineItem.qty ?? 0),
    unitPrice: Number(lineItem.unitPrice ?? 0),
    deduction: Number(lineItem.deduction ?? 0),
  }));
}

export function buildReviewClassification(
  payload: BudgetRequestReviewData,
): BudgetRequestReviewClassification {
  return {
    costCenterId: payload.costCenter || payload.budgetPlan?.costCenterId || '',
    categoryId: payload.category || payload.budgetPlan?.categoryId || '',
    categoryKeyIndexId: payload.categoryKeyIndex || payload.budgetPlan?.categoryKeyIndexId || '',
    coaId: payload.coa || payload.budgetPlan?.coaId || '',
    opexType: payload.opexType || payload.type || payload.budgetPlan?.opexType || 'OPEX',
    opexAllocationId: payload.opexAllocation || payload.budgetPlan?.opexAllocationId || '',
  };
}

export default function BudgetRequestReviewWorkspace({
  id,
  data,
  originOfficeLabel,
  cancelHref,
  successRedirectHref,
  isFinalApprovalStep,
  showActionButtons = true,
}: BudgetRequestReviewWorkspaceProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [classification, setClassification] = useState(() => buildReviewClassification(data));
  const [reviewLineItems, setReviewLineItems] = useState(() => buildReviewLineItems(data.lineItems));

  const vatPercent = Number((data as { vatPercent?: number }).vatPercent ?? 11);
  const whtPercent = Number((data as { whtPercent?: number }).whtPercent ?? 2);
  const transactionAmount = reviewLineItems.reduce(
    (sum, lineItem) => sum + Math.max(0, lineItem.qty * lineItem.unitPrice - lineItem.deduction),
    0,
  );
  const vatAmount = Math.round(transactionAmount * (vatPercent / 100));
  const whtAmount = Math.round(transactionAmount * (whtPercent / 100));
  const invoiceAmount = transactionAmount + vatAmount;
  const grandTotal = invoiceAmount - whtAmount;

  const planAllocationTotal = Number(data.budgetPlan?.allocationTotal ?? 0);
  const planRealization = Number(data.budgetPlan?.realization ?? 0);
  const planOutstanding = Number(data.budgetPlan?.outstanding ?? 0);
  const projectedOutstanding = planOutstanding - grandTotal;
  const isOverbudget = projectedOutstanding < 0;

  const canEditClassification = Boolean(data.canReview);
  const hasEditClassificationPermission = Boolean(
    session?.user?.access?.activityAccess?.editClassificationSection,
  );
  const canViewBudgetPlanSnapshot = Boolean(
    session?.user?.access?.activityAccess?.viewBudgetPlanSnapshotOnBudgetRequestReview,
  );
  const canEditClassificationFields = canEditClassification && hasEditClassificationPermission;

  const closeDeclineModal = () => {
    setIsDeclineModalOpen(false);
    setDeclineReason('');
  };

  const closeApproveModal = () => {
    setIsApproveModalOpen(false);
    setApprovalNote('');
  };

  const buildApprovePayload = (extra: Record<string, unknown> = {}) => ({
    ...extra,
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
  });

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/budget-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildApprovePayload({ approvalNote: approvalNote.trim() || null })),
      });
      if (res.ok) {
        closeApproveModal();
        router.push(successRedirectHref);
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
        body: JSON.stringify(
          buildApprovePayload({
            action: mode,
            declineReason: declineReason.trim() || null,
          }),
        ),
      });
      if (res.ok) {
        setIsDeclineModalOpen(false);
        setDeclineReason('');
        router.push(successRedirectHref);
      } else {
        alert('Failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionButtons =
    showActionButtons && data.status !== 'Approved' ? (
      <div className="flex justify-end gap-3 pt-4">
        <Link href={cancelHref} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
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

  const summaryLineItems = data.lineItems.map((lineItem) => ({
    item: lineItem.item,
    qty: lineItem.qty,
    unitPrice: lineItem.unitPrice,
    deduction: lineItem.deduction,
    total: Number(lineItem.total ?? Math.max(0, lineItem.qty * lineItem.unitPrice - Number(lineItem.deduction ?? 0))),
  }));

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{data.subject}</h1>
        <p className="mt-1 text-sm text-gray-500">{data.code}</p>
      </div>

      <Card className="space-y-6">
        <BudgetRequestDetailSummarySection
          data={{ ...data, lineItems: summaryLineItems }}
          originOfficeLabel={originOfficeLabel}
        />
      </Card>

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
                            index === i ? { ...item, qty: Number(e.target.value) || 0 } : item,
                          ),
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
                            index === i ? { ...item, unitPrice: Number(e.target.value) || 0 } : item,
                          ),
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
                <TableCell className="text-right">
                  {formatCurrency(Math.max(0, Number(li.unitPrice ?? 0) * li.qty - Number(li.deduction ?? 0)))}
                </TableCell>
              </TableBodyRow>
            ))}
            <TableBodyRow className="bg-gray-50 font-medium">
              <TableCell colSpan={5} className="text-right">
                Transaction Amount
              </TableCell>
              <TableCell className="text-right">{formatCurrency(transactionAmount)}</TableCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableCell colSpan={5} className="text-right">
                VAT / PPN
              </TableCell>
              <TableCell className="text-right">{formatCurrency(vatAmount)}</TableCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableCell colSpan={5} className="text-right">
                Invoice Amount
              </TableCell>
              <TableCell className="text-right">{formatCurrency(invoiceAmount)}</TableCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableCell colSpan={5} className="text-right">
                WHT / PPh
              </TableCell>
              <TableCell className="text-right">({formatCurrency(whtAmount)})</TableCell>
            </TableBodyRow>
            <TableBodyRow className="bg-green-200/60 hover:bg-green-200/80 text-base font-semibold">
              <TableCell colSpan={5} className="text-right">
                Grandtotal
              </TableCell>
              <TableCell className="text-right">{formatCurrency(grandTotal)}</TableCell>
            </TableBodyRow>
          </tbody>
        </Table>
      </Card>

      {canViewBudgetPlanSnapshot ? (
        <Card className="space-y-3" header={<h3 className="font-medium">Budget Plan Status</h3>}>
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
              isOverbudget ? 'bg-red-50 ring-1 ring-red-300' : 'bg-emerald-50 ring-1 ring-emerald-200'
            }`}
            role="status"
            aria-live="polite"
          >
            <span className={`text-sm font-medium ${isOverbudget ? 'text-red-700' : 'text-emerald-700'}`}>
              {isOverbudget ? 'Outstanding after approval — over budget!' : 'Outstanding after approval'}
            </span>
            <span className={`font-semibold tabular-nums ${isOverbudget ? 'text-red-800' : 'text-emerald-800'}`}>
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

      {actionButtons}

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
        <p className="mt-2 text-sm text-gray-600">Are you sure you want to approve this budget request?</p>
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
}
