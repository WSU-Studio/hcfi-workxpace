'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';
import Select from '@/components/ui/Select';

type HistoryEntry = {
  id: string;
  action: string;
  timestamp: string;
  details: { status?: string; declineReason?: string } | null;
  user: { name: string | null } | null;
};

export default function ReviewBudgetRequestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<{
    id: string;
    code: string;
    subject: string;
    description: string | null;
    notes: string | null;
    status: string;
    requestDate: string;
    fiscalYear: number;
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
  const [classification, setClassification] = useState({
    costCenterId: '',
    categoryId: '',
    categoryKeyIndexId: '',
    coaId: '',
    opexType: 'OPEX',
    opexAllocationId: '',
  });

  useEffect(() => {
    fetch(`/api/budget-requests/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        setData(payload);
        if (!payload) return;
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

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/budget-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          costCenterId: classification.costCenterId || null,
          categoryId: classification.categoryId || null,
          categoryKeyIndexId: classification.categoryKeyIndexId || null,
          coaId: classification.coaId || null,
          opexType: classification.opexType || null,
          opexAllocationId: classification.opexType === 'OPEX' ? classification.opexAllocationId || null : null,
        }),
      });
      if (res.ok) router.push(`/budget-requests/${id}`);
      else alert('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;
  if (!data) return <div className="text-gray-600">Not found</div>;

  const transactionAmount = data.lineItems?.reduce((sum, li) => sum + Number(li.total ?? 0), 0) ?? 0;
  const canEditClassification = Boolean(data.canReview);
  const orderedLevels = [...(data.approvalSchema?.approvalLevels || [])].sort((a, b) => a.stepOrder - b.stepOrder);
  const completedSteps = data.status === 'Approved' ? orderedLevels.length : data.status === 'Pending' ? 1 : 0;
  const approveHistories = (data.histories || []).filter((h) => h.action === 'approve');
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
      <Link href={`/budget-requests/${id}`} className="text-blue-600 hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold">Review Budget Request</h1>

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
            <span className={`rounded px-2 py-0.5 text-sm ${data.status === 'Approved' ? 'bg-green-100 text-green-800' : data.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
              {data.status}
            </span>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Subject:</span>
            <p className="font-medium">{data.subject}</p>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Description:</span>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{data.description || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Notes:</span>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{data.notes || '-'}</p>
          </div>
        </div>
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
            {data.lineItems.map((li, i) => (
              <TableBodyRow key={`${li.item}-${i}`}>
                <TableCell>{li.item}</TableCell>
                <TableCell className="text-right">{li.qty}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(li.unitPrice ?? 0))}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(li.subtotal ?? Number(li.unitPrice ?? 0) * li.qty))}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(li.deduction ?? 0))}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(li.total ?? 0))}</TableCell>
              </TableBodyRow>
            ))}
            <TableBodyRow className="bg-gray-50 font-medium">
              <TableCell colSpan={5} className="text-right">Transaction Amount</TableCell>
              <TableCell className="text-right">{formatCurrency(transactionAmount)}</TableCell>
            </TableBodyRow>
          </tbody>
        </Table>
      </Card>

      <Card collapsible header={<h3 className="font-medium">Classification</h3>}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block mb-1.5 text-sm font-medium">Cost Center</label>
              <Select
                value={classification.costCenterId}
                disabled={!canEditClassification}
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
                disabled={!canEditClassification}
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
                disabled={!canEditClassification}
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
                disabled={!canEditClassification}
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
                  const isCompleted = index < completedSteps;
                  const updatedAt = isCompleted ? approveHistories[index]?.timestamp : null;
                  return (
                    <TableBodyRow key={level.stepOrder}>
                      <TableCell>{level.stepOrder}</TableCell>
                      <TableCell>{level.role?.roleName ?? '-'}</TableCell>
                      <TableCell>{level.levelType}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            isCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isCompleted ? 'Approved' : 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell>{updatedAt ? formatDateTime(updatedAt) : '-'}</TableCell>
                    </TableBodyRow>
                  );
                })}
              </tbody>
            </Table>

            {data.status !== 'Approved' ? (
              <div className="flex justify-end gap-3 pt-4">
                <Link href={`/budget-requests/${id}`} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting || !data.canReview}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title={!data.canReview ? 'You are not in current review step of this approval schema' : undefined}
                >
                  {isSubmitting ? 'Submitting...' : data.status === 'Pending' ? 'Final approve' : 'Approve'}
                </button>
              </div>
            ) : null}
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
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No history yet.</p>
        )}
      </Card>
    </div>
  );
}
