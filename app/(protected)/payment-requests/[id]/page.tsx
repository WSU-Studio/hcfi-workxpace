'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { Download, Pencil, Printer, ScanSearch } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import EditWarningModal from '@/components/ui/EditWarningModal';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import RichTextContent from '@/components/ui/RichTextContent';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';
import ApprovalStepNotesList from '@/components/approval/ApprovalStepNotesList';
import ApprovalEscalationPrintGrid from '@/components/approval/ApprovalEscalationPrintGrid';
import EntityCommentPanel from '@/components/comments/EntityCommentPanel';
import { useEnableDocumentDownload } from '@/hooks/useEnableDocumentDownload';
import {
  getMultiStepApprovalProgress,
  getRequestorSubmissionStepProgress,
  getRequestStatusDisplay,
  requiresEditConfirmation,
} from '@/lib/budget-plan-approval-display';

type HistoryEntry = {
  id: string;
  action: string;
  timestamp: string;
  details: {
    status?: string;
    fromStatus?: string;
    previousStatus?: string;
    declineReason?: string | null;
    approvalNote?: string | null;
    note?: string | null;
    qtyUnitPriceAdjustmentNote?: string | null;
  } | null;
  user: { name: string | null } | null;
};

// function ReadonlyField({ label, value }: { label: string; value: string }) {
//   return (
//     <div>
//       <p className="mb-1.5 text-sm font-medium text-gray-700">{label}</p>
//       <p className="min-h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
//         {value || '-'}
//       </p>
//     </div>
//   );
// }

export default function PaymentRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session } = useSession();
  const [isEditWarningOpen, setIsEditWarningOpen] = useState(false);
  const [data, setData] = useState<{
    id: string;
    code: string;
    subject: string;
    description: string | null;
    status: string;
    notes: string | null;
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
    paymentPurpose: string | null;
    requestorId?: string | null;
    requestorName?: string | null;
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
    histories?: HistoryEntry[];
    canReview?: boolean;
    category?: string | null;
    categoryKeyIndex?: string | null;
    costCenter?: string | null;
    coa?: string | null;
    type?: string | null;
    opexAllocation?: string | null;
    opexType?: string | null;
    categoryOptions?: { id: string; name: string }[];
    categoryKeyIndexOptions?: { id: string; name: string }[];
    costCenterOptions?: { id: string; name: string }[];
    opexAllocationOptions?: { id: string; name: string }[];
    accountOptions?: { id: string; accountCode: string; accountName: string }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const printableRef = useRef<HTMLDivElement | null>(null);
  const enableDocumentDownload = useEnableDocumentDownload();

  useEffect(() => {
    fetch(`/api/payment-requests/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!data) return <div className="text-gray-600">Not found</div>;

  const canEditAsRequestor = !!session?.user?.id && data.requestorId === session.user.id;
  const orderedLevels = [...(data.approvalSchema?.approvalLevels || [])].sort((a, b) => a.stepOrder - b.stepOrder);
  // Per-step progress reconstructed from activity history. This survives
  // multi-step schemas correctly: rows already approved stay "Reviewed" even
  // after a later reviewer asks for revision, and only the requestor's
  // resubmit (logged as `update`) resets the table back to "Pending".
  const stepProgresses = getMultiStepApprovalProgress(orderedLevels, data.histories ?? []);
  const requestorStepProgress = getRequestorSubmissionStepProgress(data.histories ?? [], {
    requestorName: data.requestorName,
    requestDate: data.requestDate,
  });

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const accountLabel = (() => {
    const coaId = data.coa;
    if (!coaId) return '-';
    const account = data.accountOptions?.find((item) => item.id === coaId);
    return account ? `${account.accountCode} - ${account.accountName}` : coaId;
  })();
  const opexType = data.opexType || data.type || '-';
  // const costCenterLabel =
  //   data.costCenterOptions?.find((item) => item.id === data.costCenter)?.name ?? data.costCenter ?? '-';
  // const categoryLabel =
  //   data.categoryOptions?.find((item) => item.id === data.category)?.name ?? data.category ?? '-';
  // const categoryKeyIndexLabel =
  //   data.categoryKeyIndexOptions?.find((item) => item.id === data.categoryKeyIndex)?.name ??
  //   data.categoryKeyIndex ??
  //   '-';
  // const opexAllocationLabel =
  //   data.opexAllocationOptions?.find((item) => item.id === data.opexAllocation)?.name ??
  //   data.opexAllocation ??
  //   '-';

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

  const handleDownloadPdf = async () => {
    if (!printableRef.current || isExporting) return;
    setIsExporting(true);
    document.documentElement.setAttribute('data-exporting', 'pdf');
    const toastId = toast.loading('Menyiapkan PDF...');

    const safetyTimer = window.setTimeout(() => {
      document.documentElement.removeAttribute('data-exporting');
      setIsExporting(false);
      toast.error('Generate PDF timeout. Coba lagi.', { id: toastId });
    }, 70_000);

    try {
      const { renderPdfFromElement } = await import('@/lib/pdf/inline-computed-colors');
      const filename = `${data.code}_${slugify(data.subject) || 'payment-request'}.pdf`;
      await renderPdfFromElement(printableRef.current, { filename, timeoutMs: 60_000 });
      toast.success('PDF berhasil di-download.', { id: toastId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat PDF';
      toast.error(msg, { id: toastId });
    } finally {
      window.clearTimeout(safetyTimer);
      document.documentElement.removeAttribute('data-exporting');
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full flex-col gap-6 xl:flex-row xl:items-start print:block print:max-w-none">
      <div className="min-w-0 flex-1 space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/payment-requests" className="text-blue-600 hover:underline">
          ← Back
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="inline-flex items-center gap-2"
            aria-label="Print payment request detail"
            disabled={isExporting}
          >
            <Printer className="h-4 w-4" aria-hidden />
            Print
          </Button>
          {enableDocumentDownload ? (
            <Button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Download payment request detail as PDF"
              aria-busy={isExporting}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" aria-hidden />
              {isExporting ? 'Generating PDF...' : 'Download PDF'}
            </Button>
          ) : null}
          {canEditAsRequestor ? (
            requiresEditConfirmation(data.status) ? (
              <button
                type="button"
                onClick={() => setIsEditWarningOpen(true)}
                disabled={isExporting}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            ) : (
              <Link
                href={`/payment-requests/${id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            )
          ) : null}
        </div>
      </div>

      <div ref={printableRef} className="space-y-6">
      <div className="min-w-0">
        <p className="hidden text-xs uppercase tracking-wide text-gray-500 print:block">Payment Request</p>
        <h1 className="text-2xl font-semibold">{data.subject}</h1>
        <p className="hidden text-sm text-gray-600 print:block">
          {data.code} · FY {data.fiscalYear ?? '-'} · {data.department?.name}
        </p>
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <span className="text-gray-500">ID:</span> {data.code}
          </div>
          <div>
            <span className="text-gray-500">Request Date:</span> {formatDate(data.requestDate)}
          </div>
          <div>
            <span className="text-gray-500">Requestor:</span> {data.requestorName ?? '-'}
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
            <span className="text-gray-500">Grand total:</span>{' '}
            <span className="font-medium">
              {formatCurrency(data.amount)} {data.currency}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Payee:</span> {data.payeeName}
          </div>
          <div>
            <span className="text-gray-500">Bank Account:</span> {data.bankAccount || '-'}
          </div>
        </div>

        {data.budgetRequest ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Related budget request</p>
            <p className="mt-1 text-sm text-slate-700">
              {data.budgetRequest.code} — {data.budgetRequest.subject}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              BR total (grand): {formatCurrency(data.budgetRequest.grandTotal)} · Status BR: {data.budgetRequest.status}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No related budget request selected.</p>
        )}

        {data.description ? (
          <div>
            <span className="text-gray-500">Description:</span>{' '}
            <div className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-100">
              <RichTextContent value={data.description} />
            </div>
          </div>
        ) : null}

      </Card>

      <Card collapsible header={<h3 className="font-medium">Request Allocation</h3>}>
        {data.lineItems && data.lineItems.length > 0 ? (
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
              {data.lineItems.map((li, index) => (
                <TableBodyRow key={`${li.item}-${index}`}>
                  <TableCell>{li.item}</TableCell>
                  <TableCell className="text-right">{li.qty}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(li.unitPrice ?? 0))}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(li.subtotal ?? li.qty * Number(li.unitPrice ?? 0)))}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(li.deduction ?? 0))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(li.total ?? 0))}</TableCell>
                </TableBodyRow>
              ))}
              <TableBodyRow className="bg-gray-50 font-medium">
                <TableCell colSpan={5} className="text-right">
                  Transaction amount
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    Number(data.totalAmount ?? data.lineItems.reduce((s, l) => s + Number(l.total ?? 0), 0))
                  )}
                </TableCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableCell colSpan={5} className="text-right">
                  VAT / PPN
                </TableCell>
                <TableCell className="text-right">{formatCurrency(Number(data.vatAmount ?? 0))}</TableCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableCell colSpan={5} className="text-right">
                  Invoice amount
                </TableCell>
                <TableCell className="text-right">{formatCurrency(Number(data.invoiceAmount ?? 0))}</TableCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableCell colSpan={5} className="text-right">
                  WHT / PPh
                </TableCell>
                <TableCell className="text-right">({formatCurrency(Number(data.whtAmount ?? 0))})</TableCell>
              </TableBodyRow>
              <TableBodyRow className="bg-green-200/60 font-semibold">
                <TableCell colSpan={5} className="text-right">
                  Grand total
                </TableCell>
                <TableCell className="text-right">{formatCurrency(data.amount)}</TableCell>
              </TableBodyRow>
            </tbody>
          </Table>
        ) : null}

        <div className="space-y-3 border-t border-gray-100 mt-6">
          <h3 className="font-medium">Classification</h3>

          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-500">Cost Center:</span> {data.costCenterOptions?.find((item) => item.id === data.costCenter)?.name ?? data.costCenter ?? '-'}</div>
            <div><span className="text-gray-500">Category:</span> {data.categoryOptions?.find((item) => item.id === data.category)?.name ?? data.category ?? '-'}</div>
            <div><span className="text-gray-500">Category Key Index:</span> {data.categoryKeyIndexOptions?.find((item) => item.id === data.categoryKeyIndex)?.name ?? data.categoryKeyIndex ?? '-'}</div>
            <div><span className="text-gray-500">Kode Akun:</span> {accountLabel}</div>
            <div><span className="text-gray-500">Type:</span> {opexType}</div>
            <div><span className="text-gray-500">Opex Allocation:</span> {data.opexAllocationOptions?.find((item) => item.id === data.opexAllocation)?.name ?? data.opexAllocation ?? '-'}</div>
          </div>
          
          {/* <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ReadonlyField label="Cost Center" value={costCenterLabel} />
            <ReadonlyField label="Category" value={categoryLabel} />
            <ReadonlyField label="Category Key Index" value={categoryKeyIndexLabel} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-2">
              <ReadonlyField label="Kode Akun" value={accountLabel} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ReadonlyField label="Type" value={opexType} />
            {opexType === 'OPEX' ? <ReadonlyField label="Opex Allocation" value={opexAllocationLabel} /> : null}
          </div>
          
          <ReadonlyField label="Payee" value={data.payeeName} />
          {data.paymentPurpose ? <ReadonlyField label="Payment purpose" value={data.paymentPurpose} /> : null}
          
          {data.notes ? <ReadonlyField label="Notes" value={data.notes} /> : null} */}
        </div>

      </Card>

      <div className="print:break-before-page print:text-sm">
        <Card
          collapsible
          collapsed={!orderedLevels.length}
          header={<h3 className="font-medium">Approval Escalation</h3>}
        >
          {orderedLevels.length ? (
            <>
              <Table className="print:hidden">
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
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
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

              <ApprovalStepNotesList
                levels={orderedLevels}
                stepProgresses={stepProgresses}
                className="print:hidden"
              />

              <div className="hidden print:block">
                <ApprovalEscalationPrintGrid
                  levels={orderedLevels}
                  stepProgresses={stepProgresses}
                  // showRequestor
                  requestorStepProgress={requestorStepProgress}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No approval schema — approval by non-requestor.</p>
          )}

          {data.canReview ? (
            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 print:hidden">
              <Link
                href={`/payment-requests/${id}/review`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <ScanSearch className="h-4 w-4" />
                Review
              </Link>
            </div>
          ) : null}
        </Card>
      </div>

      <Card collapsible collapsed 
        className="print:hidden"
        header={<h3 className="font-medium">Activity History</h3>}>
        {data.histories?.length ? (
          <div className="space-y-2">
            {data.histories.map((history) => (
              <div key={history.id} className="rounded-lg bg-gray-50 p-3 text-sm print:px-0 print:pt-0 print:pb-2 print:bg-transparent print:border-b print:border-gray-200">
                <p>
                  <span className="font-medium">{history.user?.name || 'Unknown User'}</span>{' '}
                  <span className="text-gray-700">{history.action.toLowerCase()}</span>{' '}
                  <span className="text-gray-500">on {formatDateTime(history.timestamp)}</span>
                </p>
                {history.details?.fromStatus &&
                history.details?.status &&
                history.details.fromStatus !== history.details.status ? (
                  <p className="text-gray-600">
                    Status: {history.details.fromStatus} → {history.details.status}
                  </p>
                ) : history.details?.status ? (
                  <p className="text-gray-600">Status: {history.details.status}</p>
                ) : null}
                {history.details?.previousStatus ? (
                  <p className="text-gray-600">Previous status: {history.details.previousStatus}</p>
                ) : null}
                {history.details?.declineReason ? (
                  <p className="text-gray-600">Reason: {history.details.declineReason}</p>
                ) : null}
                {history.details?.approvalNote ? (
                  <p className="text-gray-600">Note: {history.details.approvalNote}</p>
                ) : null}
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
      </div>

      <EditWarningModal
        isOpen={isEditWarningOpen}
        entityType="payment-request"
        subject={data.subject}
        onCancel={() => setIsEditWarningOpen(false)}
        onContinue={() => {
          setIsEditWarningOpen(false);
          router.push(`/payment-requests/${id}/edit`);
        }}
      />
      </div>

      <aside className="sticky top-24 z-10 w-full shrink-0 self-start xl:w-96 print:hidden">
        <EntityCommentPanel
          entityBasePath="payment-requests"
          entityId={id}
          requestStatus={data.status}
          approvalLevels={orderedLevels}
          histories={data.histories ?? []}
          inputId="pr-comment-input"
        />
      </aside>
    </div>
  );
}
