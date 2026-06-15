'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import MonthChecklistSelector from '@/components/ui/MonthChecklistSelector';
import { formatCurrency } from '@/lib/utils';
import BudgetRequestItemsEditor, {
  type BudgetRequestLineItemInput,
  getItemTotal,
  getItemSubtotal,
} from '@/components/budget-request/BudgetRequestItemsEditor';
import RichTextEditor from '@/components/ui/RichTextEditor';
import DepartmentSelectField from '@/components/forms/DepartmentSelectField';
import { notifyFormError } from '@/lib/forms/feedback';

const DESCRIPTION_MAX_BYTES = 200 * 1024;

const buildEmptyLineItem = (): BudgetRequestLineItemInput => ({
  id: crypto.randomUUID(),
  item: '',
  qty: 1,
  unitPrice: 0,
  deduction: 0,
});

export default function NewBudgetRequestPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userDepartmentId = session?.user?.departmentId ?? '';
  const canCrossDepartment = Boolean(
    session?.user?.access?.activityAccess?.createForOtherDepartment,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans] = useState<{
    id: string;
    code: string;
    subject: string;
    description?: string | null;
    fiscalYear: number;
    originOffice: string | null;
    departmentId: string;
    projectId?: string | null;
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
  const [fiscalYears, setFiscalYears] = useState<{ year: number }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [originOffices, setOriginOffices] = useState<{ code: string; name: string; isActive: boolean }[]>([]);
  const [formData, setFormData] = useState({
    budgetPlanId: '',
    fiscalYear: new Date().getFullYear(),
    originOffice: '',
    departmentId: '',
    projectId: '',
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

  const errorBannerRef = useRef<HTMLDivElement | null>(null);
  const budgetPlanFieldRef = useRef<HTMLDivElement | null>(null);
  const subjectFieldRef = useRef<HTMLDivElement | null>(null);
  const descriptionFieldRef = useRef<HTMLDivElement | null>(null);
  const monthsFieldRef = useRef<HTMLDivElement | null>(null);
  const itemsFieldRef = useRef<HTMLDivElement | null>(null);
  const approvalSchemaFieldRef = useRef<HTMLDivElement | null>(null);

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
    Promise.all([
      fetch('/api/budget-requests').then((r) => r.json()),
      fetch('/api/workspace-management/approval-schema').then((r) => r.json()),
      fetch('/api/budget-plans/options').then((r) => r.json()),
    ])
      .then(([budgetRequestData, approvalSchemaData, budgetPlanOptionsData]) => {
        const nextFiscalYears = budgetPlanOptionsData.fiscalYears || [];
        const nextDepartments = budgetPlanOptionsData.departments || [];
        const nextProjects = budgetPlanOptionsData.projects || [];
        const nextOriginOffices = budgetPlanOptionsData.originOffices || [];

        setPlans(budgetRequestData.plans || []);
        setApprovalSchemas(
          approvalSchemaData.schemas?.filter((s: { type: string }) => s.type === 'BudgetRequest') || []
        );
        setFiscalYears(nextFiscalYears);
        setDepartments(nextDepartments);
        setProjects(nextProjects);
        setOriginOffices(nextOriginOffices);

        setFormData((previous) => ({
          ...previous,
          fiscalYear: nextFiscalYears?.[0]?.year ?? previous.fiscalYear,
          departmentId: nextDepartments?.[0]?.id ?? previous.departmentId,
          projectId: nextProjects?.[0]?.id ?? previous.projectId,
          originOffice:
            nextOriginOffices.length > 0
              ? (
                  nextOriginOffices.find((office: { isActive: boolean }) => office.isActive) ||
                  nextOriginOffices[0]
                )?.code ?? previous.originOffice
              : previous.originOffice || 'HQ',
        }));
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Lock the default department to the logged-in user's own department when
  // they lack cross-department permission. Only fires when no Budget Plan has
  // been picked yet — once a plan is selected, its department wins.
  useEffect(() => {
    if (canCrossDepartment) return;
    if (!userDepartmentId) return;
    if (departments.length === 0) return;
    setFormData((previous) => {
      if (previous.budgetPlanId) return previous;
      return previous.departmentId === userDepartmentId
        ? previous
        : { ...previous, departmentId: userDepartmentId };
    });
  }, [canCrossDepartment, userDepartmentId, departments]);

  const handlePlanSelect = async (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    setFormData((p) => ({
      ...p,
      budgetPlanId: planId,
      subject: plan ? `${plan.subject} - Request` : p.subject,
      description: plan ? (plan.description ?? '') : p.description,
      fiscalYear: plan?.fiscalYear ?? p.fiscalYear,
      originOffice: plan?.originOffice ?? p.originOffice,
      departmentId: plan?.departmentId ?? p.departmentId,
      projectId: plan?.projectId ?? p.projectId,
      category: plan?.categoryId ?? '',
      categoryKeyIndex: plan?.categoryKeyIndexId ?? '',
      costCenter: plan?.costCenterId ?? '',
      coa: plan?.coaId ?? '',
      type: plan?.opexType ?? '',
      opexAllocation: plan?.opexAllocationId ?? '',
      opexType: plan?.opexType ?? '',
    }));

    if (!planId) return;

    try {
      const response = await fetch(`/api/budget-plans/${planId}`);
      if (!response.ok) return;
      const payload = await response.json();
      const selectedPlan = payload?.plan;
      setFormData((previous) => ({
        ...previous,
        fiscalYear: selectedPlan?.fiscalYear ?? previous.fiscalYear,
        originOffice: selectedPlan?.originOffice ?? previous.originOffice,
        departmentId: selectedPlan?.departmentId ?? previous.departmentId,
        projectId: selectedPlan?.projectId ?? previous.projectId,
        description:
          typeof selectedPlan?.description === 'string'
            ? selectedPlan.description
            : (plan?.description ?? previous.description),
      }));
    } catch {
      // keep current description if detail fetch fails
    }
  };
  const isBudgetPlanSelected = formData.budgetPlanId !== '';
  const schemasForDept = approvalSchemas.filter((s) => s.departmentId === formData.departmentId);

  const reportError = (
    message: string,
    fieldRef?: React.RefObject<HTMLDivElement | null>,
  ) => {
    setError(message);
    notifyFormError(message, { fieldRef });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.budgetPlanId) {
      reportError('Select a budget plan before submitting', budgetPlanFieldRef);
      return;
    }
    if (!formData.subject) {
      reportError('Subject is required', subjectFieldRef);
      return;
    }
    if (!formData.approvalSchemaId) {
      reportError(
        schemasForDept.length === 0
          ? 'No approval schema is configured for the selected department. Set one up before submitting.'
          : 'Select an approval schema before submitting',
        approvalSchemaFieldRef,
      );
      return;
    }
    if (selectedMonths.length === 0) {
      reportError(
        'Select at least one month for request allocation',
        monthsFieldRef,
      );
      return;
    }
    const hasItemName = lineItems.some((item) => item.item.trim().length > 0);
    if (!hasItemName || totalAmount <= 0) {
      reportError(
        'Add item details with a total amount greater than 0',
        itemsFieldRef,
      );
      return;
    }
    const descriptionSize = new TextEncoder().encode(formData.description || '').length;
    if (descriptionSize > DESCRIPTION_MAX_BYTES) {
      reportError('Description is too large. Maximum 200KB.', descriptionFieldRef);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/budget-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fiscalYear: formData.fiscalYear,
          departmentId: formData.departmentId,
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
        // Server-rejected submissions don't have a specific field, so scroll
        // back to the top banner where the message also appears.
        reportError(d.error ?? 'Failed to submit budget request', errorBannerRef);
        return;
      }
      const data = await res.json();
      router.push(`/budget-requests/${data.id}`);
    } catch {
      reportError('Failed to submit budget request', errorBannerRef);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Budget Request</h1>
      {plans.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          No approved budget plans. Create and approve a budget plan first.
        </div>
      )}
      {error && (
        <div
          ref={errorBannerRef}
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 shadow-sm"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold">Submission failed</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div ref={budgetPlanFieldRef}>
            <label className="block mb-1.5 font-medium">Budget Plan (Approved) *</label>
            <Select
              value={formData.budgetPlanId}
              onChange={(e) => handlePlanSelect(e.target.value)}
              required
            >
              <option value="">-</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.code} - {p.subject} - {p.fiscalYear}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block mb-1.5 font-medium">Fiscal Year *</label>
              <Select
                value={formData.fiscalYear}
                onChange={(e) => setFormData((p) => ({ ...p, fiscalYear: Number(e.target.value) }))}
                required
                readonly={isBudgetPlanSelected}
              >
                {fiscalYears.map((fy) => (
                  <option key={fy.year} value={fy.year}>{fy.year}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block mb-1.5 font-medium">Origin Office *</label>
              {originOffices.length > 0 ? (
                <Select
                  value={formData.originOffice}
                  onChange={(e) => setFormData((p) => ({ ...p, originOffice: e.target.value }))}
                  required
                  readonly={isBudgetPlanSelected}
                >
                  <option value="">-</option>
                  {originOffices.map((office) => (
                    <option key={office.code} value={office.code}>
                      {office.code} - {office.name}
                      {office.isActive ? '' : ' (Inactive)'}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type="text"
                  value={formData.originOffice}
                  onChange={(e) =>
                    setFormData((previous) => ({
                      ...previous,
                      originOffice: e.target.value,
                    }))
                  }
                  placeholder="HQ"
                  required
                  readOnly={isBudgetPlanSelected}
                />
              )}
            </div>
            <DepartmentSelectField
              value={formData.departmentId}
              departments={departments}
              userDepartmentId={userDepartmentId}
              canCrossDepartment={canCrossDepartment}
              forcedReadonly={isBudgetPlanSelected}
              onChange={(departmentId) =>
                setFormData((previous) => ({ ...previous, departmentId }))
              }
            />
            <div>
              <label className="block mb-1.5 font-medium">Project</label>
              <Select
                value={formData.projectId}
                onChange={(e) => setFormData((p) => ({ ...p, projectId: e.target.value }))}
                readonly={isBudgetPlanSelected}
              >
                <option value="">-</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </Select>
            </div>
          </div>

          <div ref={subjectFieldRef}>
            <label className="block mb-1.5 font-medium">Subject *</label>
            <Input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
              required
            />
          </div>
          <div ref={descriptionFieldRef}>
            <label className="block mb-1.5 font-medium">Description</label>
            <RichTextEditor
              value={formData.description}
              onChange={(description) => setFormData((p) => ({ ...p, description }))}
              placeholder="Describe budget request details..."
              maxContentBytes={DESCRIPTION_MAX_BYTES}
            />
          </div>
          
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 hidden">
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

          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Request Allocation</h2>
            <div ref={monthsFieldRef}>
              <label className="mb-2 block font-medium">Month / Period Allocation *</label>
              <MonthChecklistSelector selectedMonths={selectedMonths} onChange={setSelectedMonths} showSelectAll/>
            </div>
          </div>

          <div ref={itemsFieldRef} className="space-y-3">
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
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 hidden debug">
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
          )} */}

          <div ref={approvalSchemaFieldRef}>
            <label className="block mb-1.5 font-medium">Approval Schema *</label>
            <Select
              value={formData.approvalSchemaId}
              onChange={(e) => setFormData((p) => ({ ...p, approvalSchemaId: e.target.value }))}
              required
              aria-invalid={!formData.approvalSchemaId}
            >
              <option value="">-</option>
              {schemasForDept.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            {formData.departmentId && schemasForDept.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-600">
                No approval schema is configured for the selected department.
              </p>
            ) : null}
          </div>

          <div>
            <label className="block mb-1.5 font-medium">Notes</label>
            <Input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href="/budget-requests" className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <X className="w-4 h-4" />
              Cancel
            </Link>
            <button type="submit" disabled={isSubmitting || plans.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
