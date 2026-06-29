'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';
import ApprovalStepNotesList from '@/components/approval/ApprovalStepNotesList';
import RichTextContent from '@/components/ui/RichTextContent';
import Input from '@/components/ui/Input';
import RequestClassificationFields from '@/components/classification/RequestClassificationFields';
import type { AccountOption, ClassificationOption } from '@/lib/classification-options';
import {
  getMultiStepApprovalProgress,
  getRequestStatusDisplay,
} from '@/lib/budget-plan-approval-display';
import {
  classificationFromStored,
  emptyRequestClassification,
  type RequestClassificationValue,
} from '@/lib/request-classification';
import { Printer } from 'lucide-react';

export default function ReviewPaymentRequestPage() {
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
    fiscalYear?: number;
    originOffice?: string | null;
    amount: number;
    totalAmount?: number;
    vatAmount?: number;
    whtAmount?: number;
    invoiceAmount?: number;
    currency: string;
    lineItems?: {
      item: string;
      qty: number;
      unitPrice: number;
      subtotal?: number;
      deduction?: number;
      total: number;
    }[];
    payeeName: string;
    bankAccount?: string | null;
    vendorInvoiceNo?: string | null;
    dateNeeded?: string | null;
    paymentPurpose: string | null;
    canReview?: boolean;
    project?: { code: string; name: string } | null;
    budgetRequest: {
      code: string;
      subject: string;
      status: string;
      grandTotal: number;
    } | null;
    department: { name: string };
    approvalSchema?: {
      approvalLevels: { stepOrder: number; levelType: string; role: { roleName: string } | null }[];
    } | null;
    histories?: {
      id: string;
      action: string;
      timestamp: string;
      details: { status?: string; declineReason?: string | null; approvalNote?: string | null } | null;
      user: { name: string | null } | null;
    }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [classification, setClassification] = useState<RequestClassificationValue>(emptyRequestClassification());
  const [categoryOptions, setCategoryOptions] = useState<ClassificationOption[]>([]);
  const [categoryKeyIndexOptions, setCategoryKeyIndexOptions] = useState<ClassificationOption[]>([]);
  const [costCenterOptions, setCostCenterOptions] = useState<ClassificationOption[]>([]);
  const [opexAllocationOptions, setOpexAllocationOptions] = useState<ClassificationOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([]);

  useEffect(() => {
    fetch(`/api/payment-requests/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        setData(payload);
        if (!payload) return;
        setClassification(classificationFromStored(payload));
        setCategoryOptions(payload.categoryOptions || []);
        setCategoryKeyIndexOptions(payload.categoryKeyIndexOptions || []);
        setCostCenterOptions(payload.costCenterOptions || []);
        setOpexAllocationOptions(payload.opexAllocationOptions || []);
        setAccountOptions(payload.accountOptions || []);
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

  const classificationPayload = {
    costCenterId: classification.costCenterId || null,
    categoryId: classification.categoryId || null,
    categoryKeyIndexId: classification.categoryKeyIndexId || null,
    coaId: classification.coaId || null,
    opexType: classification.opexType || null,
    opexAllocationId: classification.opexType === 'OPEX' ? classification.opexAllocationId || null : null,
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payment-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalNote: approvalNote.trim() || null,
          ...classificationPayload,
        }),
      });
      if (res.ok) {
        closeApproveModal();
        router.push(`/payment-requests/${id}`);
      } else alert('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async (mode: 'revision' | 'decline') => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payment-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          declineReason: declineReason.trim() || undefined,
          ...classificationPayload,
        }),
      });
      if (res.ok) {
        setIsDeclineModalOpen(false);
        router.push(`/payment-requests/${id}`);
      } else alert('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;
  if (!data) return <div className="text-gray-600">Not found</div>;

  const orderedLevels = [...(data.approvalSchema?.approvalLevels || [])].sort((a, b) => a.stepOrder - b.stepOrder);
  const stepProgresses = getMultiStepApprovalProgress(orderedLevels, data.histories ?? []);
  // Used only by the Approval History card below to render a flat ASC list.
  const approveHistories = (data.histories || [])
    .filter((h) => h.action === 'approve')
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  // The next step the current reviewer is about to act on is the first one
  // whose progress is still "Pending" (or "Revision"/"Declined" — but those
  // are blocked until the requestor resubmits, so the button is hidden anyway).
  // "Final approve" only applies to the very last step in the schema.
  const nextStepIndex = stepProgresses.findIndex(
    (step) => step.statusLabel !== 'Reviewed' && step.statusLabel !== 'Approved',
  );
  const isFinalApprovalStep =
    orderedLevels.length > 0 && nextStepIndex === orderedLevels.length - 1;
  // PR review only edits the Classification section (no line-item editing
  // here, unlike BR review), so the variable can be folded directly: a user
  // who can review BUT lacks `editClassificationSection` sees the section
  // read-only and the underlying `RequestClassificationFields` honors that.
  const hasEditClassificationPermission = Boolean(
    session?.user?.access?.activityAccess?.editClassificationSection,
  );
  const canEditClassification = Boolean(data.canReview) && hasEditClassificationPermission;
  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-col gap-2">
          <Link href={`/payment-requests/${id}`} className="text-blue-600 hover:underline">
            ← Back
          </Link>
          <h1 className="text-2xl font-semibold">Review Payment Request</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="inline-flex items-center gap-2"
            aria-label="Print payment request review"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Print
          </Button>
        </div>
      </div>

      <Card className="space-y-4"
      header={<h3 className="font-medium">Request information</h3>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-gray-500">ID:</span> {data.code}
          </div>
          <div>
            <span className="text-gray-500">Request Date:</span> {formatDate(data.requestDate)}
          </div>
          <div>
            <span className="text-gray-500">Department:</span> {data.department?.name ?? '-'}
          </div>
          <div>
            <span className="text-gray-500">Fiscal Year:</span> {data.fiscalYear ?? '-'}
          </div>
          <div>
            <span className="text-gray-500">Origin Office:</span> {data.originOffice ?? '-'}
          </div>
          <div>
            <span className="text-gray-500">Project:</span>{' '}
            {data.project ? `${data.project.code} — ${data.project.name}` : '-'}
          </div>
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
          <div>
            <span className="text-gray-500">Grand total:</span>{' '}
            <span className="font-semibold">
              {formatCurrency(data.amount)} {data.currency}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Payee:</span> {data.payeeName}
          </div>
          <div>
            <span className="text-gray-500">Bank Account:</span> {data.bankAccount || '-'}
          </div>
          <div>
            <span className="text-gray-500">Vendor Invoice No:</span> {data.vendorInvoiceNo || '-'}
          </div>
          <div>
            <span className="text-gray-500">Date Needed:</span>{' '}
            {data.dateNeeded ? formatDate(data.dateNeeded) : '-'}
          </div>
          {data.paymentPurpose ? (
            <div className="md:col-span-2">
              <span className="text-gray-500">Payment purpose:</span>
              <p className="mt-1 whitespace-pre-wrap text-gray-700">{data.paymentPurpose}</p>
            </div>
          ) : null}

          {data.budgetRequest ? (
            <div className="space-y-1 text-sm text-gray-700 p-2 rounded-lg border border-slate-200 bg-slate-50 md:col-span-2">
              <span className="text-gray-500">Related budget request:</span>
              <p className="font-medium">
                {data.budgetRequest.code} — {data.budgetRequest.subject}
              </p>
              <p className="text-sm text-gray-600">
                Grand total BR: {formatCurrency(data.budgetRequest.grandTotal)} · Status: {data.budgetRequest.status}
              </p>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <span className="text-gray-500">Description:</span>
            {data.description ? <RichTextContent value={data.description} className="mt-1" /> : <p className="mt-1">-</p>}
          </div>
          
          <div className="md:col-span-2">
            <span className="text-gray-500">Notes:</span>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{data.notes || '-'}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3" 
      collapsible
      header={<h3 className="font-medium">Request Allocation</h3>}>
        {data.lineItems && data.lineItems.length > 0 ? (
          <Table>
            <thead>
              <TableHeaderRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableHeaderRow>
            </thead>
            <tbody>
              {data.lineItems.map((li, index) => (
                <TableBodyRow key={`${li.item}-${index}`}>
                  <TableCell>{li.item}</TableCell>
                  <TableCell className="text-right">{li.qty}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(li.unitPrice ?? 0))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(li.total ?? 0))}</TableCell>
                </TableBodyRow>
              ))}
              <TableBodyRow className="bg-gray-50 font-medium">
                <TableCell colSpan={3} className="text-right">
                  Transaction
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    Number(data.totalAmount ?? data.lineItems.reduce((s, l) => s + Number(l.total ?? 0), 0))
                  )}
                </TableCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableCell colSpan={3} className="text-right">
                  VAT
                </TableCell>
                <TableCell className="text-right">{formatCurrency(Number(data.vatAmount ?? 0))}</TableCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableCell colSpan={3} className="text-right">
                  Invoice
                </TableCell>
                <TableCell className="text-right">{formatCurrency(Number(data.invoiceAmount ?? 0))}</TableCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableCell colSpan={3} className="text-right">
                  WHT
                </TableCell>
                <TableCell className="text-right">({formatCurrency(Number(data.whtAmount ?? 0))})</TableCell>
              </TableBodyRow>
              <TableBodyRow className="font-semibold">
                <TableCell colSpan={3} className="text-right">
                  Grand total
                </TableCell>
                <TableCell className="text-right">{formatCurrency(data.amount)}</TableCell>
              </TableBodyRow>
            </tbody>
          </Table>
        ) : null}
      </Card>

      <Card collapsible header={<h3 className="font-medium">Classification</h3>}>
        <RequestClassificationFields
          value={classification}
          onChange={setClassification}
          categoryOptions={categoryOptions}
          categoryKeyIndexOptions={categoryKeyIndexOptions}
          costCenterOptions={costCenterOptions}
          opexAllocationOptions={opexAllocationOptions}
          accountOptions={accountOptions}
          readOnly={!canEditClassification}
        />
      </Card>

      <div>
        {orderedLevels.length ? (
          <Card collapsible header={<h3 className="font-medium">Approval escalation</h3>}>
            <Table>
              <thead>
                <TableHeaderRow>
                  <TableHead>#</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated at</TableHead>
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

            {data.status !== 'Approved' ? (
              <div className="flex justify-end gap-3 pt-4 print:hidden">
                <Link
                  href={`/payment-requests/${id}`}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={() => setIsDeclineModalOpen(true)}
                  disabled={isSubmitting || !data.canReview}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  title={!data.canReview ? 'You are not in the current review step for this approval schema' : undefined}
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => setIsApproveModalOpen(true)}
                  disabled={isSubmitting || !data.canReview}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  title={!data.canReview ? 'You are not in the current review step for this approval schema' : undefined}
                >
                  {isSubmitting ? 'Processing…' : isFinalApprovalStep ? 'Final approve' : 'Approve'}
                </button>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>

      {approveHistories.length > 0 ? (
        <Card collapsible header={<h3 className="font-medium">Approval history</h3>}>
          <ul className="space-y-2 text-sm">
            {approveHistories.map((h) => (
              <li key={h.id} className="flex justify-between gap-2 border-b border-gray-100 pb-2 last:border-0">
                <span>{h.user?.name ?? '-'}</span>
                <span className="text-gray-500">{formatDateTime(h.timestamp)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Modal
        isOpen={isDeclineModalOpen}
        onClose={closeDeclineModal}
        closeOnEscape={!isSubmitting}
        overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        panelClassName="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
      >
            <h2 className="text-lg font-semibold text-slate-900">Revision or Decline</h2>
            <p className="mt-2 text-sm text-slate-600">Provide a reason (optional but recommended).</p>
            <Input
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason"
              className="mt-4"
            />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeDeclineModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDecline('revision')}
                disabled={isSubmitting}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-60"
              >
                Request revision
              </button>
              <button
                type="button"
                onClick={() => handleDecline('decline')}
                disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
              >
                Decline
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
              Are you sure you want to approve this payment request?
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
    </div>
  );
}
