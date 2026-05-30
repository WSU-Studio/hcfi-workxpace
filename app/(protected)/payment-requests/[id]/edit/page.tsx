'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import RichTextEditor from '@/components/ui/RichTextEditor';
import BudgetRequestItemsEditor, {
  type BudgetRequestLineItemInput,
  getItemSubtotal,
  getItemTotal,
} from '@/components/budget-request/BudgetRequestItemsEditor';
const DESCRIPTION_MAX_BYTES = 200 * 1024;

const buildEmptyLineItem = (): BudgetRequestLineItemInput => ({
  id: crypto.randomUUID(),
  item: '',
  qty: 1,
  unitPrice: 0,
  deduction: 0,
});

type PaymentRequestLineApi = {
  id: string;
  item: string;
  qty: number;
  unitPrice: unknown;
  subtotal?: unknown;
  deduction?: unknown;
  total: unknown;
};

const mapApiLineToEditor = (li: PaymentRequestLineApi): BudgetRequestLineItemInput => ({
  id: li.id,
  item: li.item,
  qty: Number(li.qty),
  unitPrice: Number(li.unitPrice),
  deduction: Number(li.deduction ?? 0),
});

type BrLineItemApi = {
  item: string;
  qty: number;
  unitPrice: number;
  deduction: number;
};

type ApprovedBrOption = {
  id: string;
  code: string;
  subject: string;
  description: string | null;
  departmentId: string;
  grandTotal: number;
  fiscalYear: number;
  vatPercent: number;
  whtPercent: number;
  lineItems: BrLineItemApi[];
  budgetPlan: { originOffice: string | null; projectId: string | null } | null;
};

const mapBrLineItemsToEditor = (rows: BrLineItemApi[] | undefined): BudgetRequestLineItemInput[] => {
  const mapped = (rows ?? [])
    .filter((li) => String(li.item ?? '').trim().length > 0)
    .map((li) => ({
      id: crypto.randomUUID(),
      item: String(li.item).trim(),
      qty: Math.max(0, Math.round(Number(li.qty)) || 0),
      unitPrice: Number.isFinite(Number(li.unitPrice)) ? Number(li.unitPrice) : 0,
      deduction: Math.max(0, Number.isFinite(Number(li.deduction)) ? Number(li.deduction) : 0),
    }));
  return mapped.length > 0 ? mapped : [buildEmptyLineItem()];
};

export default function EditPaymentRequestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session, status: sessionStatus } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [approvedBudgetRequests, setApprovedBudgetRequests] = useState<ApprovedBrOption[]>([]);
  const [approvalSchemas, setApprovalSchemas] = useState<{ id: string; name: string; departmentId: string }[]>([]);
  const [fiscalYears, setFiscalYears] = useState<{ year: number }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [originOffices, setOriginOffices] = useState<{ code: string; name: string; isActive: boolean }[]>([]);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    notes: '',
    approvalSchemaId: '',
    budgetRequestId: '',
    fiscalYear: new Date().getFullYear(),
    originOffice: '',
    departmentId: '',
    projectId: '',
    currency: 'IDR',
    payeeName: '',
    paymentPurpose: '',
  });
  const [error, setError] = useState('');
  const [lineItems, setLineItems] = useState<BudgetRequestLineItemInput[]>([buildEmptyLineItem()]);
  const [taxConfig, setTaxConfig] = useState({ vatPercent: 11, whtPercent: 2 });

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

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    setLoadError('');
    Promise.all([
      fetch('/api/payment-requests').then((r) => r.json()),
      fetch('/api/workspace-management/approval-schema').then((r) => r.json()),
      fetch('/api/budget-plans/options').then((r) => r.json()),
      fetch(`/api/payment-requests/${id}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([prListData, approvalSchemaData, optionsData, row]) => {
        setApprovedBudgetRequests(prListData.approvedBudgetRequests || []);
        setApprovalSchemas(
          approvalSchemaData.schemas?.filter((s: { type: string }) => s.type === 'PaymentRequest') || []
        );
        setFiscalYears(optionsData.fiscalYears || []);
        setDepartments(optionsData.departments || []);
        setProjects(optionsData.projects || []);
        setOriginOffices(optionsData.originOffices || []);

        if (!row) {
          setLoadError('Request not found');
          return;
        }
        if (session?.user?.id && row.requestorId !== session.user.id) {
          router.replace(`/payment-requests/${id}`);
          return;
        }

        setFormData({
          subject: row.subject ?? '',
          description: row.description ?? '',
          notes: row.notes ?? '',
          approvalSchemaId: row.approvalSchemaId ?? '',
          budgetRequestId: row.budgetRequestId ?? '',
          fiscalYear: row.fiscalYear ?? new Date().getFullYear(),
          originOffice: row.originOffice ?? '',
          departmentId: row.departmentId ?? '',
          projectId: row.projectId ?? '',
          currency: row.currency ?? 'IDR',
          payeeName: row.payeeName ?? '',
          paymentPurpose: row.paymentPurpose ?? '',
        });
        setLineItems(
          Array.isArray(row.lineItems) && row.lineItems.length > 0
            ? (row.lineItems as PaymentRequestLineApi[]).map(mapApiLineToEditor)
            : [buildEmptyLineItem()]
        );
        setTaxConfig({
          vatPercent: Number(row.vatPercent ?? 11),
          whtPercent: Number(row.whtPercent ?? 2),
        });
      })
      .catch(() => setLoadError('Failed to load'))
      .finally(() => setIsLoading(false));
  }, [id, session?.user?.id, sessionStatus, router]);

  const handleBudgetRequestChange = (brId: string) => {
    if (!brId) {
      const defaultOrigin =
        originOffices.length > 0
          ? (originOffices.find((o) => o.isActive) ?? originOffices[0])?.code ?? ''
          : 'HQ';
      setFormData((prev) => ({
        ...prev,
        budgetRequestId: '',
        subject: '',
        description: '',
        notes: '',
        approvalSchemaId: '',
        payeeName: '',
        paymentPurpose: '',
        currency: 'IDR',
        fiscalYear: fiscalYears[0]?.year ?? new Date().getFullYear(),
        departmentId: departments[0]?.id ?? '',
        projectId: projects[0]?.id ?? '',
        originOffice: defaultOrigin,
      }));
      setLineItems([buildEmptyLineItem()]);
      setTaxConfig({ vatPercent: 11, whtPercent: 2 });
      return;
    }

    const br = approvedBudgetRequests.find((b) => b.id === brId);
    if (!br) {
      setFormData((prev) => ({ ...prev, budgetRequestId: brId }));
      return;
    }
    const brTitle = (br.subject || br.code).trim();
    setFormData((prev) => ({
      ...prev,
      budgetRequestId: brId,
      subject: brTitle ? `${brTitle} payment-requests` : prev.subject,
      description: br.description?.trim() ? br.description : '',
      departmentId: br.departmentId,
      fiscalYear: br.fiscalYear,
      originOffice: br.budgetPlan?.originOffice ?? prev.originOffice,
      projectId: br.budgetPlan?.projectId ?? '',
    }));
    setLineItems(mapBrLineItemsToEditor(br.lineItems));
    setTaxConfig({
      vatPercent: Number.isFinite(br.vatPercent) ? br.vatPercent : 11,
      whtPercent: Number.isFinite(br.whtPercent) ? br.whtPercent : 2,
    });
  };

  const isBudgetRequestSelected = formData.budgetRequestId !== '';
  const schemasForDept = approvalSchemas.filter((s) => s.departmentId === formData.departmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.subject.trim() || !formData.payeeName.trim()) {
      setError('Enter subject and payee.');
      return;
    }
    if (!formData.departmentId) {
      setError('Select department.');
      return;
    }
    if (!isBudgetRequestSelected && !formData.originOffice?.trim()) {
      setError('Select origin office.');
      return;
    }
    if (!formData.approvalSchemaId) {
      setError(
        schemasForDept.length === 0
          ? 'No approval schema is configured for the selected department. Set one up before submitting.'
          : 'Select an approval schema before submitting.'
      );
      return;
    }
    const hasItemName = lineItems.some((item) => item.item.trim().length > 0);
    if (!hasItemName || totalAmount <= 0) {
      setError('Add item details with a total amount greater than 0.');
      return;
    }
    const descriptionSize = new TextEncoder().encode(formData.description || '').length;
    if (descriptionSize > DESCRIPTION_MAX_BYTES) {
      setError('Description is too large. Maximum 200KB.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payment-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject.trim(),
          description: formData.description || null,
          notes: formData.notes || null,
          approvalSchemaId: formData.approvalSchemaId || null,
          budgetRequestId: formData.budgetRequestId || null,
          departmentId: formData.departmentId,
          fiscalYear: formData.fiscalYear,
          originOffice: formData.originOffice || null,
          projectId: formData.projectId || null,
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
          currency: formData.currency,
          payeeName: formData.payeeName.trim(),
          paymentPurpose: formData.paymentPurpose || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed');
        return;
      }
      router.push(`/payment-requests/${id}`);
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

  const fiscalYearOptions =
    fiscalYears.length > 0 ? fiscalYears : [{ year: new Date().getFullYear() }];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit Payment Request</h1>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{error}</div> : null}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-1.5 block font-medium">Budget Request (Approved, optional)</label>
            <Select value={formData.budgetRequestId} onChange={(e) => handleBudgetRequestChange(e.target.value)}>
              <option value="">-</option>
              {approvedBudgetRequests.map((br) => (
                <option key={br.id} value={br.id}>
                  {br.code} - {br.subject}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block font-medium">Fiscal Year *</label>
              <Select
                value={formData.fiscalYear}
                onChange={(e) => setFormData((p) => ({ ...p, fiscalYear: Number(e.target.value) }))}
                required
                readonly={isBudgetRequestSelected}
              >
                {fiscalYearOptions.map((fy) => (
                  <option key={fy.year} value={fy.year}>
                    {fy.year}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block font-medium">Origin Office *</label>
              {originOffices.length > 0 ? (
                <Select
                  value={formData.originOffice}
                  onChange={(e) => setFormData((p) => ({ ...p, originOffice: e.target.value }))}
                  required={!isBudgetRequestSelected}
                  readonly={isBudgetRequestSelected}
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
                  onChange={(e) => setFormData((p) => ({ ...p, originOffice: e.target.value }))}
                  placeholder="HQ"
                  required={!isBudgetRequestSelected}
                  readOnly={isBudgetRequestSelected}
                />
              )}
            </div>
            <div>
              <label className="mb-1.5 block font-medium">Department *</label>
              <Select
                value={formData.departmentId}
                onChange={(e) => setFormData((p) => ({ ...p, departmentId: e.target.value }))}
                required
                readonly={isBudgetRequestSelected}
              >
                <option value="">-</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block font-medium">Project</label>
              <Select
                value={formData.projectId}
                onChange={(e) => setFormData((p) => ({ ...p, projectId: e.target.value }))}
                readonly={isBudgetRequestSelected}
              >
                <option value="">-</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-medium">Subject *</label>
            <Input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block font-medium">Description</label>
            <RichTextEditor
              value={formData.description}
              onChange={(description) => setFormData((p) => ({ ...p, description }))}
              placeholder="Describe the payment request..."
              maxContentBytes={DESCRIPTION_MAX_BYTES}
            />
          </div>

          <div className="space-y-3">
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

          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Payment details</h2>
            <div>
              <label className="mb-1.5 block font-medium">Currency</label>
              <Input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData((p) => ({ ...p, currency: e.target.value.toUpperCase() }))}
                maxLength={8}
                className="max-w-xs"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-medium">Payee *</label>
              <Input
                type="text"
                value={formData.payeeName}
                onChange={(e) => setFormData((p) => ({ ...p, payeeName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block font-medium">Payment purpose</label>
              <Input
                type="text"
                value={formData.paymentPurpose}
                onChange={(e) => setFormData((p) => ({ ...p, paymentPurpose: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-medium">Approval Schema *</label>
            <Select
              value={formData.approvalSchemaId}
              onChange={(e) => setFormData((p) => ({ ...p, approvalSchemaId: e.target.value }))}
              required
              aria-invalid={!formData.approvalSchemaId}
            >
              <option value="">-</option>
              {schemasForDept.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            {formData.departmentId && schemasForDept.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-600">
                No approval schema is configured for the selected department.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block font-medium">Notes</label>
            <Input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Link
              href={`/payment-requests/${id}`}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || departments.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
