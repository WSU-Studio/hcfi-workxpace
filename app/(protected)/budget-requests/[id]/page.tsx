'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { Download, Pencil, Printer, ScanSearch, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EditWarningModal from '@/components/ui/EditWarningModal';
import LoadingSpin from '@/components/ui/LoadingSpin';
import RichTextContent from '@/components/ui/RichTextContent';
import MonthChecklistSelector from '@/components/ui/MonthChecklistSelector';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';
import ApprovalStepNotesList from '@/components/approval/ApprovalStepNotesList';
import ApprovalEscalationPrintGrid from '@/components/approval/ApprovalEscalationPrintGrid';
import BudgetRequestPeriodAllocationSummary from '@/components/budget-requests/BudgetRequestPeriodAllocationSummary';
import {
  BudgetRequestClassificationSection,
  BudgetRequestDetailSummarySection,
  BudgetRequestLineItemsSection,
} from '@/components/budget-requests/BudgetRequestDetailSections';
import EntityCommentPanel from '@/components/comments/EntityCommentPanel';
import SupportingDocumentLinks from '@/components/forms/SupportingDocumentLinks';
import DocumentPrintHeader from '@/components/print/DocumentPrintHeader';
import DocumentPrintRequesterDetails from '@/components/print/DocumentPrintRequesterDetails';
import { useEnableDocumentDownload } from '@/hooks/useEnableDocumentDownload';
import { normalizeSupportingDocs } from '@/lib/supporting-docs';
import { formatBudgetRequestOriginOfficeLabel } from '@/lib/budget-requests/display';
import { isBudgetRequestCompactDetailView } from '@/lib/deployment-ui-policy';
import {
  getMultiStepApprovalProgress,
  getRequestorSubmissionStepProgress,
  requiresEditConfirmation,
} from '@/lib/budget-plan-approval-display';

type HistoryEntry = {
  id: string;
  action: string;
  timestamp: string;
  details: { status?: string; declineReason?: string; approvalNote?: string | null; qtyUnitPriceAdjustmentNote?: string | null } | null;
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

const usingCompactView = isBudgetRequestCompactDetailView();

export default function BudgetRequestDetailPage() {
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
    requestorId?: string | null;
    requestorName?: string | null;
    fiscalYear: number;
    supportingDocs?: unknown;
    totalAmount?: number;
    vatAmount?: number;
    whtAmount?: number;
    invoiceAmount?: number;
    grandTotal?: number;
    budgetPlan: {
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
    };
    department: { name: string };
    lineItems: { item: string; qty: number; unitPrice: number; subtotal?: number; deduction?: number; total: number }[];
    allocations: { year: number; month: number; allocation: number }[];
    approvalSchema?: {
      approvalLevels: { stepOrder: number; levelType: string; role: { roleName: string } | null }[];
    } | null;
    histories?: HistoryEntry[];
    canReview?: boolean;
    accountOptions?: { id: string; accountCode: string; accountName: string }[];
    originOffices?: { code: string; name: string; isActive: boolean }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const printableRef = useRef<HTMLDivElement | null>(null);
  const enableDocumentDownload = useEnableDocumentDownload();

  useEffect(() => {
    fetch(`/api/budget-requests/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!data) return <div className="text-gray-600">Not found</div>;

  const transactionAmount = data.lineItems?.reduce((s, l) => s + Number(l.total ?? 0), 0) ?? 0;
  const vatAmount = Number(data.vatAmount ?? 0);
  const whtAmount = Number(data.whtAmount ?? 0);
  const invoiceAmount = Number(data.invoiceAmount ?? transactionAmount + vatAmount);
  const grandTotal = Number(data.grandTotal ?? invoiceAmount - whtAmount);
  const allocatedMonths = Array.from(new Set((data.allocations || []).map((a) => a.month))).sort((a, b) => a - b);
  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const canEditAsRequestor =
    !!session?.user?.id &&
    data.requestorId === session.user.id;
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
  const accountLabel = (() => {
    const coaId = data.budgetPlan?.coaId;
    if (!coaId) return '-';
    const account = data.accountOptions?.find((item) => item.id === coaId);
    return account ? `${account.accountCode} - ${account.accountName}` : coaId;
  })();
  const opexType = data.budgetPlan?.opexType || '-';
  const originOfficeLabel = formatBudgetRequestOriginOfficeLabel(data, data.originOffices);

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
      const filename = `${data.code}_${slugify(data.subject) || 'budget-request'}.pdf`;
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

  const amountTotals = {
    transactionAmount,
    vatAmount,
    whtAmount,
    invoiceAmount,
    grandTotal,
  };

  if (usingCompactView) {
    return (
      <div className="mx-auto flex w-full flex-col gap-6 xl:flex-row xl:items-start print:block print:max-w-none">
        <div className="mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <Link href="/budget-requests" className="text-blue-600 hover:underline">
              ← Back
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrint}
                className="inline-flex items-center gap-2"
                aria-label="Print budget request detail"
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
                  aria-label="Download budget request detail as PDF"
                  aria-busy={isExporting}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  {isExporting ? 'Generating PDF...' : 'Download PDF'}
                </Button>
              ) : null}
              <Link
                href={`/budget-requests/${id}/detail`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 h-10 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                <Eye className="h-4 w-4" aria-hidden /> 
                Detail
              </Link>
              {data.canReview ? (
                <Link
                  href={`/budget-requests/${id}/review`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <ScanSearch className="h-4 w-4" />
                  Review
                </Link>
              ) : null}
              {canEditAsRequestor ? (
                requiresEditConfirmation(data.status) ? (
                  <button
                    type="button"
                    onClick={() => setIsEditWarningOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                ) : (
                  <Link
                    href={`/budget-requests/${id}/edit`}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                )
              ) : null}
            </div>
          </div>

          <div className="hidden print:block border-2 border-gray-300 print:w-full print:max-w-full print:overflow-hidden space-y-6">
            <DocumentPrintHeader
              className="table w-full max-w-full"
              number={data.code}
              title="Budget Request"
              classification="Decision Making"
              sectionLabel="Requester"
            />

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

            <DocumentPrintRequesterDetails
              date={data.requestDate}
              teamName={data.department?.name ?? '-'}
              subject={data.subject}
              purpose=""
              plan={data.description}
            />
          </div>

          <Card className="space-y-4 print:hidden">
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

          <Card className="space-y-4 print:hidden">
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
              <div className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-24">
                <RichTextContent value={data.description} />
              </div>
            </div>
            <div className="print:hidden">
              <p className="text-sm text-gray-500">Supporting Documents</p>
              <SupportingDocumentLinks urls={normalizeSupportingDocs(data.supportingDocs)} />
            </div>
          </Card>

          <EditWarningModal
            isOpen={isEditWarningOpen}
            entityType="budget-request"
            subject={data.subject}
            onCancel={() => setIsEditWarningOpen(false)}
            onContinue={() => {
              setIsEditWarningOpen(false);
              router.push(`/budget-requests/${id}/edit`);
            }}
          />
        </div>

        <aside className="sticky top-24 z-10 w-full shrink-0 self-start xl:w-96 print:hidden">
        <EntityCommentPanel
          entityBasePath="budget-requests"
          entityId={id}
          requestStatus={data.status}
          approvalLevels={orderedLevels}
          histories={data.histories ?? []}
          inputId="br-comment-input"
        />
        </aside>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-6 xl:flex-row xl:items-start print:block print:max-w-none">
      <div className="min-w-0 flex-1 space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/budget-requests" className="text-blue-600 hover:underline">← Back</Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="inline-flex items-center gap-2"
            aria-label="Print budget request detail"
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
              aria-label="Download budget request detail as PDF"
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
                href={`/budget-requests/${id}/edit`}
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
      <DocumentPrintHeader
        className="hidden print:table"
        number={data.code}
        title="Budget Request"
        classification="Decision Making"
        sectionLabel="Requester"
      />

      <DocumentPrintRequesterDetails
        className="hidden print:table"
        date={data.requestDate}
        teamName={data.department?.name ?? '-'}
        subject={data.subject}
        purpose={data.description}
        plan={data.notes}
      />

      <div className="min-w-0 print:hidden">
        <h1 className="text-2xl font-semibold">{data.subject}</h1>
      </div>

      <Card className="space-y-4">
        <BudgetRequestDetailSummarySection data={data} originOfficeLabel={originOfficeLabel} />
      </Card>

      <Card collapsible 
        collapsed 
        className="print:break-inside-avoid print:text-sm"
        header={<h3 className="font-medium">Request Allocation</h3>}>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block font-medium">Month / Period Allocation</label>
            <MonthChecklistSelector selectedMonths={allocatedMonths} readOnly />
          </div>

          <BudgetRequestPeriodAllocationSummary
            grandTotal={grandTotal}
            monthCount={allocatedMonths.length}
            allocations={data.allocations}
          />

          {data.lineItems?.length ? (
            <BudgetRequestLineItemsSection lineItems={data.lineItems} totals={amountTotals} />
          ) : null}
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <BudgetRequestClassificationSection data={data} accountLabel={accountLabel} opexType={opexType} />
        </div>
      </Card>

      <div className="print:break-before-page print:text-sm">
        <Card
          collapsible
          collapsed
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
              />

              {/* <div className="hidden print:block">
                <ApprovalEscalationPrintGrid
                  levels={orderedLevels}
                  stepProgresses={stepProgresses}
                  showRequestor
                  requestorStepProgress={requestorStepProgress}
                />
              </div> */}
            </>
          ) : (
            <p className="text-sm text-gray-500">No approval escalation schema configured.</p>
          )}

          {canEditAsRequestor || data.canReview ? (
            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 print:hidden">
              {canEditAsRequestor ? (
                requiresEditConfirmation(data.status) ? (
                  <button
                    type="button"
                    onClick={() => setIsEditWarningOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                ) : (
                  <Link
                    href={`/budget-requests/${id}/edit`}
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                )
              ) : null}
              {data.canReview ? (
                <Link
                  href={`/budget-requests/${id}/review`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <ScanSearch className="h-4 w-4" />
                  Review
                </Link>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>

      <Card
        collapsible
        collapsed
        className="print:hidden"
        header={<h3 className="font-medium">Activity History</h3>}
      >
        {data.histories?.length ? (
          <div className="space-y-2">
            {data.histories.map((history) => (
              <div key={history.id} className="rounded-lg bg-gray-50 p-3 text-sm print:px-0 print:pt-0 print:pb-2 print:bg-transparent print:border-b print:border-gray-200">
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
      </div>
      <EditWarningModal
        isOpen={isEditWarningOpen}
        entityType="budget-request"
        subject={data.subject}
        onCancel={() => setIsEditWarningOpen(false)}
        onContinue={() => {
          setIsEditWarningOpen(false);
          router.push(`/budget-requests/${id}/edit`);
        }}
      />
      </div>

      <aside className="sticky top-24 z-10 w-full shrink-0 self-start xl:w-96 print:hidden">
        <EntityCommentPanel
          entityBasePath="budget-requests"
          entityId={id}
          requestStatus={data.status}
          approvalLevels={orderedLevels}
          histories={data.histories ?? []}
          inputId="br-comment-input"
        />
      </aside>
    </div>
  );
}
