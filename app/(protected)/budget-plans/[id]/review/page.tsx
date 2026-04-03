'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Select from '@/components/ui/Select';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReviewBudgetPlanPage() {
  const params = useParams();
  const router = useRouter();
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
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [categoryKeyIndexOptions, setCategoryKeyIndexOptions] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [costCenterOptions, setCostCenterOptions] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [opexAllocationOptions, setOpexAllocationOptions] = useState<{ id: string; name: string }[]>([]);
  const [reviewMeta, setReviewMeta] = useState<{ canReview: boolean; nextStepOrder: number | null }>({ canReview: false, nextStepOrder: null });
  const [histories, setHistories] = useState<{
    id: string;
    action: string;
    details: { status?: string; declineReason?: string | null } | null;
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
        setCategoryOptions(data?.categoryOptions || []);
        setCategoryKeyIndexOptions(data?.categoryKeyIndexOptions || []);
        setCostCenterOptions(data?.costCenterOptions || []);
        setOpexAllocationOptions(data?.opexAllocationOptions || []);
        setReviewMeta(data?.reviewMeta || { canReview: false, nextStepOrder: null });
        setHistories(data?.histories || []);
        if (p) {
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
      })
      .finally(() => setIsLoading(false));
  }, [id]);

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

  const total = plan.allocations?.reduce((s, a) => s + Number(a.allocation ?? 0), 0) ?? 0;
  const canTakeAction = (plan.status === 'Draft' || plan.status === 'Reviewed') && reviewMeta.canReview;
  const canEditClassification = canTakeAction;
  const reviewedAt = histories.find((history) => history.details?.status === 'Reviewed');
  const hasReviewedStep = !!reviewedAt;

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStepProgress = (levelType: string) => {
    if (levelType === 'Reviewer') {
      const reviewerHistory = histories.find((history) =>
        ['Reviewed', 'Revision', 'Declined'].includes(history.details?.status || '')
      );
      if (!reviewerHistory) return { statusLabel: 'Pending', timestampLabel: '-' };

      return {
        statusLabel: reviewerHistory.details?.status || 'Processed',
        timestampLabel: formatDateTime(reviewerHistory.timestamp),
      };
    }

    const approverHistory = histories.find((history) => {
      const status = history.details?.status || '';
      if (status === 'Approved') return true;
      if (!['Revision', 'Declined'].includes(status)) return false;
      return hasReviewedStep && reviewedAt && new Date(history.timestamp) > new Date(reviewedAt.timestamp);
    });

    if (!approverHistory) return { statusLabel: 'Pending', timestampLabel: '-' };
    return {
      statusLabel: approverHistory.details?.status || 'Processed',
      timestampLabel: formatDateTime(approverHistory.timestamp),
    };
  };

  return (
    <div className="max-w-4xl space-y-6">
      <Link href={`/budget-plans/${id}`} className="text-blue-600 hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold">Review Budget Plan</h1>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">ID:</span> {plan.code}</div>
          <div><span className="text-gray-500">Request Date:</span> {formatDate(plan.requestDate)}</div>
          <div><span className="text-gray-500">Fiscal Year:</span> {plan.fiscalYear}</div>
          <div><span className="text-gray-500">Department:</span> {plan.department?.name}</div>
          <div><span className="text-gray-500">Origin Office:</span> {plan.originOffice || '-'}</div>
        </div>
        <div>
          <span className="text-gray-500">Subject:</span>
          <p className="font-medium">{plan.subject}</p>
        </div>
        <div>
          <span className="text-gray-500">Description:</span>
          <p className="mt-1 text-gray-700">{plan.description || '-'}</p>
        </div>

        <div>
          <h3 className="font-medium mb-2">Monthly Allocation</h3>
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-2 px-3">#</th>
                <th className="text-left py-2 px-3">Month</th>
                <th className="text-right py-2 px-3">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {(plan.allocations || []).map((a, i) => (
                <tr key={a.month} className="border-b">
                  <td className="py-2 px-3">{i + 1}</td>
                  <td className="py-2 px-3">{MONTH_NAMES[a.month - 1]}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(Number(a.allocation ?? 0))}</td>
                </tr>
              ))}
              <tr className="font-medium bg-gray-50">
                <td colSpan={2} className="py-2 px-3">Total</td>
                <td className="py-2 px-3 text-right">{formatCurrency(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium">Classification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium">Cost Center</label>
              <Select
                value={classification.costCenterId}
                disabled={!canEditClassification}
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
              <label className="block mb-1.5 text-sm font-medium">Kode Akun</label>
              <Select
                value={classification.coaId}
                disabled={!canEditClassification}
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
            <div>
              <label className="block mb-1.5 text-sm font-medium">Category</label>
              <Select
                value={classification.categoryId}
                disabled={!canEditClassification}
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
                disabled={!canEditClassification}
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
            <div>
              <label className="block mb-1.5 text-sm font-medium">Type</label>
              <Select
                value={classification.opexType}
                disabled={!canEditClassification}
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
                  disabled={!canEditClassification}
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

        {plan.approvalSchema?.approvalLevels?.length ? (
          <div>
            <h3 className="font-medium mb-2">Approval Escalation</h3>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Role</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {plan.approvalSchema.approvalLevels.map((l, i) => {
                  const stepProgress = getStepProgress(l.levelType);
                  return (
                    <tr key={i} className="border-b">
                      <td className="py-2 px-3">{l.stepOrder}</td>
                      <td className="py-2 px-3">{l.role?.roleName}</td>
                      <td className="py-2 px-3">{l.levelType}</td>
                      <td className="py-2 px-3">
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
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-700">{stepProgress.timestampLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {(plan.status === 'Draft' || plan.status === 'Reviewed') && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href={`/budget-plans/${id}`} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</Link>
            <button
              type="button"
              onClick={() => setIsDeclineModalOpen(true)}
              disabled={isSubmitting || !canTakeAction}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canTakeAction ? 'You are not in current review step of this approval schema' : undefined}
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => setIsApproveModalOpen(true)}
              disabled={isSubmitting || !canTakeAction}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canTakeAction ? 'You are not in current review step of this approval schema' : undefined}
            >
              {isSubmitting ? 'Processing...' : 'Approve'}
            </button>
          </div>
        )}
      </Card>

      {isDeclineModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
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
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDecline('revision')}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Ask For Revision
              </button>
              <button
                type="button"
                onClick={() => handleDecline('decline')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                disabled={isSubmitting}
              >
                Yes, I Decline
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isApproveModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Approval Confirmation</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to approve this budget plan?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="p-6">
        <h3 className="font-medium mb-3">Budget Plan History</h3>
        {histories.length === 0 ? (
          <p className="text-sm text-gray-500">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {histories.map((history) => (
              <div key={history.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                <p>
                  <span className="font-medium">{history.user?.name || 'Unknown User'}</span>{' '}
                  <span className="text-gray-700">{history.action.toLowerCase()}</span>{' '}
                  <span className="text-gray-500">on {formatDate(history.timestamp)}</span>
                </p>
                {history.details?.status ? (
                  <p className="text-gray-600">Status: {history.details.status}</p>
                ) : null}
                {history.details?.declineReason ? (
                  <p className="text-gray-600">Reason: {history.details.declineReason}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
