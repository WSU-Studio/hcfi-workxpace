'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { formatCurrency } from '@/lib/utils';
import MonthAllocationSelector from '@/components/budget-request/MonthAllocationSelector';
import BudgetRequestItemsEditor, {
  type BudgetRequestLineItemInput,
  getItemTotal,
  getItemSubtotal,
} from '@/components/budget-request/BudgetRequestItemsEditor';

const buildEmptyLineItem = (): BudgetRequestLineItemInput => ({
  id: crypto.randomUUID(),
  item: '',
  qty: 1,
  unitPrice: 0,
  deduction: 0,
});

export default function NewBudgetRequestPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans] = useState<{
    id: string;
    code: string;
    subject: string;
    departmentId: string;
    categoryId?: string | null;
    categoryKeyIndexId?: string | null;
    costCenterId?: string | null;
    coaId?: string | null;
    opexType?: string | null;
    opexAllocationId?: string | null;
    category?: { name: string } | null;
    costCenter?: { name: string } | null;
    categoryKeyIndex?: { name: string } | null;
    opexAllocation?: { name: string } | null;
  }[]>([]);
  const [approvalSchemas, setApprovalSchemas] = useState<{ id: string; name: string; departmentId: string }[]>([]);
  const [formData, setFormData] = useState({
    budgetPlanId: '',
    subject: '',
    description: '',
    notes: '',
    approvalSchemaId: '',
    category: '',
    categoryKeyIndex: '',
    costCenter: '',
    coa: '',
    type: '',
    opexAllocation: '',
    opexType: '',
  });
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [lineItems, setLineItems] = useState<BudgetRequestLineItemInput[]>([buildEmptyLineItem()]);
  const [taxConfig, setTaxConfig] = useState({ vatPercent: 11, whtPercent: 2 });
  const [error, setError] = useState('');

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
    fetch('/api/budget-requests')
      .then((r) => r.json())
      .then((data) => {
        setPlans(data.plans || []);
      });
    fetch('/api/workspace-management/approval-schema')
      .then((r) => r.json())
      .then((data) => {
        setApprovalSchemas(data.schemas?.filter((s: { type: string }) => s.type === 'BudgetRequest') || []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handlePlanSelect = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    setFormData((p) => ({
      ...p,
      budgetPlanId: planId,
      subject: plan ? `${plan.subject} - Request` : p.subject,
      category: plan?.categoryId ?? '',
      categoryKeyIndex: plan?.categoryKeyIndexId ?? '',
      costCenter: plan?.costCenterId ?? '',
      coa: plan?.coaId ?? '',
      type: plan?.opexType ?? '',
      opexAllocation: plan?.opexAllocationId ?? '',
      opexType: plan?.opexType ?? '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.budgetPlanId || !formData.subject) {
      setError('Select budget plan and enter subject');
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
    setIsSubmitting(true);
    try {
      const plan = plans.find((p) => p.id === formData.budgetPlanId);
      const res = await fetch('/api/budget-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fiscalYear: new Date().getFullYear(),
          departmentId: plan?.departmentId,
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
      const data = await res.json();
      router.push(`/budget-requests/${data.id}`);
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Create Budget Request</h1>
      {plans.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          No approved budget plans. Create and approve a budget plan first.
        </div>
      )}
      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-1.5 font-medium">Budget Plan (Approved) *</label>
            <select
              value={formData.budgetPlanId}
              onChange={(e) => handlePlanSelect(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-white"
              required
            >
              <option value="">- Select -</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.code} - {p.subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Approval Schema</label>
            <select
              value={formData.approvalSchemaId}
              onChange={(e) => setFormData((p) => ({ ...p, approvalSchemaId: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg bg-white"
            >
              <option value="">-</option>
              {approvalSchemas.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h2 className="text-base font-semibold text-gray-900">Classification (Default from Budget Plan)</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm text-gray-600">Category</label>
                <p className="rounded-lg border bg-white px-3 py-2 text-sm">{plans.find((p) => p.id === formData.budgetPlanId)?.category?.name ?? '-'}</p>
              </div>
              <div>
                <label className="block mb-1 text-sm text-gray-600">Cost Center</label>
                <p className="rounded-lg border bg-white px-3 py-2 text-sm">{plans.find((p) => p.id === formData.budgetPlanId)?.costCenter?.name ?? '-'}</p>
              </div>
              <div>
                <label className="block mb-1 text-sm text-gray-600">Category Key Index</label>
                <p className="rounded-lg border bg-white px-3 py-2 text-sm">{plans.find((p) => p.id === formData.budgetPlanId)?.categoryKeyIndex?.name ?? '-'}</p>
              </div>
              <div>
                <label className="block mb-1 text-sm text-gray-600">Type</label>
                <p className="rounded-lg border bg-white px-3 py-2 text-sm">{formData.opexType || '-'}</p>
              </div>
            </div>
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
          {allocationPreview.length > 0 && (
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-700">Allocation Preview (Transaction Amount)</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {allocationPreview.map((allocation) => (
                  <div key={allocation.month} className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm">
                    <span className="font-medium text-gray-700">Month {allocation.month}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(allocation.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href="/budget-requests" className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <X className="w-4 h-4" />
              Cancel
            </Link>
            <button type="submit" disabled={isSubmitting || plans.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
