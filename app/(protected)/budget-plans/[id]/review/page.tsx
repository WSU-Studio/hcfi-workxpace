'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { getApprovalStepProgress } from '@/lib/budget-plan-approval-display';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import RichTextContent from '@/components/ui/RichTextContent';
import { PenSquare } from 'lucide-react';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReviewBudgetPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;
  const [plan, setPlan] = useState<{
    code: string;
    subject: string;
    description: string | null;
    fiscalYear: number;
    originOffice: string | null;
    status: string;
    requestDate: string;
    department: { name: string };
    project: { name: string } | null;
    allocations: { month: number; allocation: unknown }[];
    coaId?: string | null;
    categoryId?: string | null;
    categoryKeyIndexId?: string | null;
    costCenterId?: string | null;
    opexId?: string | null;
    opexAllocationId?: string | null;
    opexType?: string | null;
    category?: { id: string; name: string } | null;
    costCenter?: { id: string; name: string } | null;
    approvalSchema?: { approvalLevels: { stepOrder: number; levelType: string; role: { roleName: string } }[] };
  } | null>(null);
  const [accountOptions, setAccountOptions] = useState<{ id: string; accountCode: string; accountName: string; description: string }[]>([]);
  const [originOffices, setOriginOffices] = useState<{ code: string; name: string; isActive: boolean }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [categoryKeyIndexOptions, setCategoryKeyIndexOptions] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [costCenterOptions, setCostCenterOptions] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [opexAllocationOptions, setOpexAllocationOptions] = useState<{ id: string; name: string }[]>([]);
  const [reviewMeta, setReviewMeta] = useState<{ canReview: boolean; nextStepOrder: number | null }>({ canReview: false, nextStepOrder: null });
  const [histories, setHistories] = useState<{
    id: string;
    action: string;
    details: {
      status?: string;
      declineReason?: string | null;
      allocationAdjustmentNote?: string | null;
    } | null;
    timestamp: string;
    user: { name: string };
  }[]>([]);
  const [classification, setClassification] = useState({
    coaId: '',
    categoryId: '',
    categoryKeyIndexId: '',
    costCenterId: '',
    opexAllocationId: '',
    opexType: 'OPEX',
  });
  const [allocations, setAllocations] = useState<Record<number, number>>(
    Object.fromEntries([...Array(12)].map((_, index) => [index + 1, 0]))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoadError(null);
    fetch(`/api/budget-plans/${id}`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setLoadError(typeof body?.error === 'string' ? body.error : `Could not load plan (${r.status})`);
          setPlan(null);
          setAccountOptions([]);
          setOriginOffices([]);
          setCategoryOptions([]);
          setCategoryKeyIndexOptions([]);
          setCostCenterOptions([]);
          setOpexAllocationOptions([]);
          setReviewMeta({ canReview: false, nextStepOrder: null });
          setHistories([]);
          return;
        }
        const data = await r.json();
        const p = data?.plan;
        setPlan(p);
        setAccountOptions(data?.accountOptions || []);
        setOriginOffices(data?.originOffices || []);
        setCategoryOptions(data?.categoryOptions || []);
        setCategoryKeyIndexOptions(data?.categoryKeyIndexOptions || []);
        setCostCenterOptions(data?.costCenterOptions || []);
        setOpexAllocationOptions(data?.opexAllocationOptions || []);
        setReviewMeta(data?.reviewMeta || { canReview: false, nextStepOrder: null });
        setHistories(data?.histories || []);
        if (p) {
          const nextAllocations: Record<number, number> = Object.fromEntries(
            [...Array(12)].map((_, index) => [index + 1, 0])
          );
          (p.allocations || []).forEach((allocation: { month: number; allocation: unknown }) => {
            nextAllocations[allocation.month] = Number(allocation.allocation ?? 0);
          });
          setAllocations(nextAllocations);
          setClassification({
            coaId: p.coaId || '',
            categoryId: p.categoryId || '',
            categoryKeyIndexId: p.categoryKeyIndexId || '',
            costCenterId: p.costCenterId || '',
            opexAllocationId: p.opexAllocationId || '',
            opexType: p.opexType || 'OPEX',
          });
        }
      })
      .catch(() => {
        setLoadError('Network error');
        setPlan(null);
        setOriginOffices([]);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if ((!isDeclineModalOpen && !isApproveModalOpen) || isSubmitting) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (isDeclineModalOpen) {
        setIsDeclineModalOpen(false);
        setDeclineReason('');
      } else {
        setIsApproveModalOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isDeclineModalOpen, isApproveModalOpen, isSubmitting]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const targetStatus = plan?.status === 'Draft' ? 'Reviewed' : 'Approved';
      const res = await fetch(`/api/budget-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          coaId: classification.coaId || null,
          categoryId: classification.categoryId || null,
          categoryKeyIndexId: classification.categoryKeyIndexId || null,
          costCenterId: classification.costCenterId || null,
          opexId: null,
          opexAllocationId: classification.opexType === 'OPEX' ? classification.opexAllocationId || null : null,
          opexType: classification.opexType || null,
          allocations: [...Array(12)].map((_, index) => ({
            month: index + 1,
            allocation: allocations[index + 1] ?? 0,
          })),
        }),
      });
      if (res.ok) {
        setIsApproveModalOpen(false);
        router.push(`/budget-plans/${id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async (mode: 'revision' | 'decline') => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/budget-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: mode === 'revision' ? 'Revision' : 'Declined',
          declineReason: declineReason.trim() || null,
          coaId: classification.coaId || null,
          categoryId: classification.categoryId || null,
          categoryKeyIndexId: classification.categoryKeyIndexId || null,
          costCenterId: classification.costCenterId || null,
          opexId: null,
          opexAllocationId: classification.opexType === 'OPEX' ? classification.opexAllocationId || null : null,
          opexType: classification.opexType || null,
          allocations: [...Array(12)].map((_, index) => ({
            month: index + 1,
            allocation: allocations[index + 1] ?? 0,
          })),
        }),
      });
      if (res.ok) {
        setIsDeclineModalOpen(false);
        setDeclineReason('');
        router.push(`/budget-plans/${id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;
  if (loadError) return <div className="text-red-500">{loadError}</div>;
  if (!plan) return <div className="text-red-500">Not found</div>;

  const allocationRows = [...Array(12)].map((_, index) => ({
    month: index + 1,
    allocation: allocations[index + 1] ?? 0,
  }));
  const total = allocationRows.reduce((sum, allocation) => sum + allocation.allocation, 0);
  const selectedOriginOffice = plan.originOffice
    ? originOffices.find((office) => office.code === plan.originOffice)
    : null;
  const originOfficeLabel = selectedOriginOffice
    ? `${selectedOriginOffice.code} - ${selectedOriginOffice.name}`
    : (plan.originOffice || '-');
  const canTakeAction = (plan.status === 'Draft' || plan.status === 'Reviewed') && reviewMeta.canReview;
  // Drives the Allocation grid editability (review-eligibility only).
  const canEditClassification = canTakeAction;
  // Classification section is additionally gated by the dedicated permission
  // `editClassificationSection`. Reviewers without this permission still see
  // the section but as read-only — they can approve/decline but cannot
  // re-tag the document's COA / cost center / category.
  const hasEditClassificationPermission = Boolean(
    session?.user?.access?.activityAccess?.editClassificationSection,
  );
  const canEditClassificationFields = canEditClassification && hasEditClassificationPermission;
  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="max-w-4xl space-y-6">
      <Link href={`/budget-plans/${id}`} className="text-blue-600 hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold">Review Budget Plan</h1>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-gray-500">ID:</span> {plan.code}</div>
          <div><span className="text-gray-500">Request Date:</span> {formatDate(plan.requestDate)}</div>
          <div><span className="text-gray-500">Fiscal Year:</span> {plan.fiscalYear}</div>
          <div><span className="text-gray-500">Department:</span> {plan.department?.name}</div>
          <div><span className="text-gray-500">Origin Office:</span> {originOfficeLabel}</div>
          <div className="col-span-2">
            <span className="text-gray-500">Subject:</span>
            <p className="font-medium">{plan.subject}</p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Description:</span>
            <RichTextContent value={plan.description} className="mt-1" />
          </div>
        </div>
      </Card>

      <Card
        collapsible
        header={
          <h3 className="font-medium">Monthly Allocation</h3>
        }
      >
        <div>
          <Table>
            <thead>
              <TableHeaderRow>  
                <TableHead>#</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Allocation</TableHead>
              </TableHeaderRow>
            </thead>
            <tbody>
              {allocationRows.map((a, i) => (
                <TableBodyRow key={a.month}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{MONTH_NAMES[a.month - 1]}</TableCell>
                  <TableCell>
                    {canEditClassification ? (
                      <Input
                        type="number"
                        value={a.allocation}
                        onChange={(e) =>
                          setAllocations((previous) => ({
                            ...previous,
                            [a.month]: Number(e.target.value) || 0,
                          }))
                        }
                        className="max-w-[180px]"
                      />
                    ) : (
                      formatCurrency(Number(a.allocation ?? 0))
                    )}
                  </TableCell>
                </TableBodyRow>
              ))}
              <TableBodyRow className="font-medium bg-gray-50">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell>{formatCurrency(total)}</TableCell>
              </TableBodyRow>
            </tbody>
          </Table>
        </div>

        <div className="space-y-3 mt-8">
          <h3 className="font-medium">Classification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium">Cost Center</label>
              <Select
                value={classification.costCenterId}
                disabled={!canEditClassificationFields}
                onChange={(e) => setClassification((p) => ({ ...p, costCenterId: e.target.value }))}
              >
                <option value="">-</option>
                {costCenterOptions.map((costCenter) => (
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
                {categoryOptions.map((category) => (
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
                {categoryKeyIndexOptions.map((categoryKeyIndex) => (
                  <option key={categoryKeyIndex.id} value={categoryKeyIndex.id}>
                    {categoryKeyIndex.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block mb-1.5 text-sm font-medium">Kode Akun</label>
              <Select
                value={classification.coaId}
                disabled={!canEditClassificationFields}
                onChange={(e) => setClassification((p) => ({ ...p, coaId: e.target.value }))}
              >
                <option value="">-</option>
                {accountOptions.map((account) => (
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
                  {opexAllocationOptions.map((allocation) => (
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
        
      <div>
        {plan.approvalSchema?.approvalLevels?.length ? (
          <Card
            collapsible
            header={<h3 className="font-medium">Approval Escalation</h3>}
          >
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
                {plan.approvalSchema.approvalLevels.map((l, i) => {
                  const stepProgress = getApprovalStepProgress(l.levelType, histories);
                  return (
                    <TableBodyRow key={i}>
                      <TableCell>{l.stepOrder}</TableCell>
                      <TableCell>{l.role?.roleName}</TableCell>
                      <TableCell>{l.levelType}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            stepProgress.statusLabel === 'Pending'
                              ? 'bg-gray-100 text-gray-700'
                              : stepProgress.statusLabel === 'Approved' || stepProgress.statusLabel === 'Reviewed'
                                ? 'bg-green-100 text-green-800'
                                : stepProgress.statusLabel === 'Revision'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {stepProgress.statusLabel}
                        </span>
                      </TableCell>
                      <TableCell>{stepProgress.timestampLabel}</TableCell>
                    </TableBodyRow>
                  );
                })}
              </tbody>
            </Table>

            {(plan.status === 'Draft' || plan.status === 'Reviewed') && (
              <div className="flex justify-end gap-3 pt-4">
                <Link href={`/budget-plans/${id}`} className="px-4 py-2 border border-gray-500 rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</Link>
                <button
                  type="button"
                  onClick={() => setIsDeclineModalOpen(true)}
                  disabled={isSubmitting || !canTakeAction}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  title={!canTakeAction ? 'You are not in current review step of this approval schema' : undefined}
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => setIsApproveModalOpen(true)}
                  disabled={isSubmitting || !canTakeAction}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  title={!canTakeAction ? 'You are not in current review step of this approval schema' : undefined}
                >
                  {isSubmitting ? 'Processing...' : 'Approve'}
                </button>
              </div>
            )}
          </Card>
        ) : null}
      </div>

      {isDeclineModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 m-0">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Decline Confirmation</h3>
            <p className="mt-2 text-sm text-gray-600">
              Do you want to decline this budget plan? You may ask for revision.
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
                onClick={() => {
                  setIsDeclineModalOpen(false);
                  setDeclineReason('');
                }}
                className="px-4 py-2 border border-gray-500 rounded-lg hover:bg-gray-50 cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDecline('revision')}
                className="px-4 py-2 flex items-center gap-2 border border-gray-500 rounded-lg hover:bg-gray-50 cursor-pointer"
                disabled={isSubmitting}
              >
                <PenSquare className="w-5 h-5 text-gray-500" />
                Ask For Revision
              </button>
              <button
                type="button"
                onClick={() => handleDecline('decline')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
                disabled={isSubmitting}
              >
                Yes, I Decline
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isApproveModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 m-0">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Approval Confirmation</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to approve this budget plan?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="px-4 py-2 border border-gray-500 rounded-lg hover:bg-gray-50 cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Card
        collapsible
        header={<h3 className="font-medium">Budget Plan History</h3>}
      >
        {histories.length === 0 ? (
          <p className="text-sm text-gray-500">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {histories.map((history) => (
              <div key={history.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                <p>
                  <span className="font-medium">{history.user?.name || 'Unknown User'}</span>{' '}
                  <span className="text-gray-700">{history.action.toLowerCase()}</span>{' '}
                  <span className="text-gray-500">on {formatDateTime(history.timestamp)}</span>
                </p>
                {history.details?.status ? (
                  <p className="text-gray-600">Status: {history.details.status}</p>
                ) : null}
                {history.details?.declineReason ? (
                  <p className="text-gray-600">Reason: {history.details.declineReason}</p>
                ) : null}
                {history.details?.allocationAdjustmentNote ? (
                  <p className="text-amber-700">
                    {history.details?.allocationAdjustmentNote}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
