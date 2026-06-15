'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { formatCurrency } from '@/lib/utils';
import MonthAllocationSelector from '@/components/budget-request/MonthAllocationSelector';
import BudgetRequestItemsEditor, {
  type BudgetRequestLineItemInput,
  getItemTotal,
  getItemSubtotal,
} from '@/components/budget-request/BudgetRequestItemsEditor';
import RichTextEditor from '@/components/ui/RichTextEditor';

const DESCRIPTION_MAX_BYTES = 200 * 1024;

type BudgetRequestApi = {
  id: string;
  budgetPlanId: string;
  subject: string;
  description: string | null;
  notes: string | null;
  approvalSchemaId: string | null;
  fiscalYear: number;
  requestorId: string | null;
  status: string;
  vatPercent?: unknown;
  whtPercent?: unknown;
  lineItems: {
    id: string;
    item: string;
    qty: number;
    unitPrice: unknown;
    subtotal?: unknown;
    deduction?: unknown;
    total: unknown;
  }[];
  allocations: { month: number }[];
};

const mapApiLineToEditor = (li: BudgetRequestApi['lineItems'][0]): BudgetRequestLineItemInput => ({
  id: li.id,
  item: li.item,
  qty: Number(li.qty),
  unitPrice: Number(li.unitPrice),
  deduction: Number(li.deduction ?? 0),
});

export default function EditBudgetRequestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session, status: sessionStatus } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [plans, setPlans] = useState<{ id: string; code: string; subject: string; departmentId: string }[]>([]);
  const [approvalSchemas, setApprovalSchemas] = useState<{ id: string; name: string; departmentId: string }[]>([]);
  const [formData, setFormData] = useState({
    budgetPlanId: '',
    subject: '',
    description: '',
    notes: '',
    approvalSchemaId: '',
  });
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [lineItems, setLineItems] = useState<BudgetRequestLineItemInput[]>([]);
  const [taxConfig, setTaxConfig] = useState({ vatPercent: 11, whtPercent: 2 });
  const [error, setError] = useState('');
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());

  const totalAmount = useMemo(
    () => lineItems.reduce((sum, item) => sum + getItemTotal(item), 0),
    [lineItems]
  );
  const vatAmount = useMemo(
    () => Math.round(totalAmount * (taxConfig.vatPercent / 100)),
    [totalAmount, taxConfig.vatPercent]
  );
  const invoiceAmount = useMemo(() => totalAmount + vatAmount, [totalAmount, vatAmount]);
  const whtAmount = useMemo(
    () => Math.round(totalAmount * (taxConfig.whtPercent / 100)),
    [totalAmount, taxConfig.whtPercent]
  );
  const grandTotal = useMemo(() => invoiceAmount - whtAmount, [invoiceAmount, whtAmount]);

  const allocationPreview = useMemo(() => {
    if (selectedMonths.length === 0 || totalAmount <= 0) return [];
    const totalCents = Math.round(totalAmount * 100);
    const baseCents = Math.floor(totalCents / selectedMonths.length);
    const remainder = totalCents - baseCents * selectedMonths.length;
    return selectedMonths
      .slice()
      .sort((a, b) => a - b)
      .map((month, index) => ({
        month,
        amount: (baseCents + (index === selectedMonths.length - 1 ? remainder : 0)) / 100,
      }));
  }, [selectedMonths, totalAmount]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    setLoadError('');
    Promise.all([
      fetch('/api/budget-requests').then((r) => r.json()),
      fetch('/api/workspace-management/approval-schema').then((r) => r.json()),
      fetch(`/api/budget-requests/${id}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([listData, schemaData, br]) => {
        setPlans(listData.plans || []);
        setApprovalSchemas(schemaData.schemas?.filter((s: { type: string }) => s.type === 'BudgetRequest') || []);

        if (!br) {
          setLoadError('Request not found');
          return;
        }
        const data = br as BudgetRequestApi;
        if (session?.user?.id && data.requestorId !== session.user.id) {
          router.replace(`/budget-requests/${id}`);
          return;
        }

        setFormData({
          budgetPlanId: data.budgetPlanId,
          subject: data.subject,
          description: data.description ?? '',
          notes: data.notes ?? '',
          approvalSchemaId: data.approvalSchemaId ?? '',
        });
        const months = Array.from(new Set((data.allocations || []).map((a) => a.month))).sort((a, b) => a - b);
        setSelectedMonths(months);
        setLineItems(
          (data.lineItems || []).length > 0
            ? data.lineItems.map(mapApiLineToEditor)
            : [
                {
                  id: crypto.randomUUID(),
                  item: '',
                  qty: 1,
                  unitPrice: 0,
                  deduction: 0,
                },
              ]
        );
        setTaxConfig({
          vatPercent: Number(data.vatPercent ?? 11),
          whtPercent: Number(data.whtPercent ?? 2),
        });
        setFiscalYear(data.fiscalYear);
      })
      .catch(() => setLoadError('Failed to load'))
      .finally(() => setIsLoading(false));
  }, [id, session?.user?.id, sessionStatus, router]);

  const handlePlanSelect = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    setFormData((p) => ({
      ...p,
      budgetPlanId: planId,
      subject: plan ? `${plan.subject} - Request` : p.subject,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.budgetPlanId || !formData.subject) {
      setError('Select budget plan and enter subject');
      return;
    }
    if (!formData.approvalSchemaId) {
      setError(
        schemasForDept.length === 0
          ? 'No approval schema is configured for the selected department. Set one up before submitting.'
          : 'Select an approval schema before submitting'
      );
      return;
    }
    if (selectedMonths.length === 0) {
      setError('Select at least one month for request allocation');
      return;
    }
    const hasItemName = lineItems.some((item) => item.item.trim().length > 0);
    if (!hasItemName || totalAmount <= 0) {
      setError('Add item details with a total amount greater than 0');
      return;
    }
    const plan = plans.find((p) => p.id === formData.budgetPlanId);
    if (!plan) {
      setError('Invalid budget plan');
      return;
    }
    const descriptionSize = new TextEncoder().encode(formData.description || '').length;
    if (descriptionSize > DESCRIPTION_MAX_BYTES) {
      setError('Description is too large. Maximum 200KB.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/budget-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fiscalYear,
          selectedMonths,
          vatPercent: taxConfig.vatPercent,
          vatAmount,
          whtPercent: taxConfig.whtPercent,
          whtAmount,
          invoiceAmount,
          grandTotal,
          lineItems: lineItems
            .filter((item) => item.item.trim().length > 0)
            .map((item) => ({
              item: item.item,
              qty: item.qty,
              unitPrice: item.unitPrice,
              subtotal: getItemSubtotal(item),
              deduction: item.deduction,
              total: getItemTotal(item),
            })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed');
        return;
      }
      router.push(`/budget-requests/${id}`);
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionStatus === 'loading' || isLoading) return <LoadingSpin />;
  if (sessionStatus === 'unauthenticated' || !session?.user?.id) {
    return <div className="text-gray-600">Please sign in to edit this request.</div>;
  }
  if (loadError) return <div className="text-red-600">{loadError}</div>;

  const currentPlanDeptId = plans.find((p) => p.id === formData.budgetPlanId)?.departmentId;
  const schemasForDept = approvalSchemas.filter((s) => !currentPlanDeptId || s.departmentId === currentPlanDeptId);

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit Budget Request</h1>
      {plans.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          No approved budget plans. Create and approve a budget plan first.
        </div>
      )}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-1.5 block font-medium">Budget Plan (Approved) *</label>
            <select
              value={formData.budgetPlanId}
              onChange={(e) => handlePlanSelect(e.target.value)}
              className="w-full rounded-lg border bg-white px-4 py-2"
              required
            >
              <option value="">- Select -</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.subject}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block font-medium">Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
              className="w-full rounded-lg border px-4 py-2"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block font-medium">Description</label>
            <RichTextEditor
              value={formData.description}
              onChange={(description) => setFormData((p) => ({ ...p, description }))}
              placeholder="Describe budget request details..."
              maxContentBytes={DESCRIPTION_MAX_BYTES}
            />
          </div>
          <div>
            <label className="mb-1.5 block font-medium">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-medium">Approval Schema *</label>
            <select
              value={formData.approvalSchemaId}
              onChange={(e) => setFormData((p) => ({ ...p, approvalSchemaId: e.target.value }))}
              className="w-full rounded-lg border bg-white px-4 py-2"
              required
              aria-invalid={!formData.approvalSchemaId}
            >
              <option value="">-</option>
              {schemasForDept.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {currentPlanDeptId && schemasForDept.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-600">
                No approval schema is configured for the budget plan&apos;s department.
              </p>
            ) : null}
          </div>
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h2 className="text-base font-semibold text-gray-900">Request Allocation</h2>
            <div>
              <label className="mb-2 block font-medium">Month / Period Allocation *</label>
              <MonthAllocationSelector selectedMonths={selectedMonths} onChange={setSelectedMonths} />
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-gray-200 p-4">
            <h2 className="text-base font-semibold text-gray-900">Items</h2>
            <BudgetRequestItemsEditor
              items={lineItems}
              onChange={setLineItems}
              taxConfig={taxConfig}
              onTaxChange={setTaxConfig}
              summary={{
                transactionAmount: totalAmount,
                vatAmount,
                whtAmount,
                invoiceAmount,
                grandTotal,
              }}
            />
          </div>
          {/* {allocationPreview.length > 0 && (
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Allocation Preview (Transaction Amount)
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {allocationPreview.map((allocation) => (
                  <div
                    key={allocation.month}
                    className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-gray-700">Month {allocation.month}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(allocation.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )} */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Link
              href={`/budget-requests/${id}`}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || plans.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
