'use client';

import { useRef, useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import BudgetRequestForm from '@/components/budget-requests/BudgetRequestForm';
import { useBudgetRequestForm } from '@/hooks/useBudgetRequestForm';
import { notifyFormError } from '@/lib/forms/feedback';
import {
  BudgetRequestFormOptions,
  buildEmptyLineItem,
  buildLineItemsPayload,
  mapApiLineToEditor,
  selectedMonthsFromAllocations,
  validateBudgetRequestForm,
} from '@/lib/budget-requests/form';

type BudgetRequestApi = {
  id: string;
  budgetPlanId: string;
  subject: string;
  description: string | null;
  notes: string | null;
  approvalSchemaId: string | null;
  fiscalYear: number;
  departmentId: string;
  requestorId: string | null;
  status: string;
  vatPercent?: unknown;
  whtPercent?: unknown;
  lineItems: {
    id: string;
    item: string;
    qty: number;
    unitPrice: unknown;
    deduction?: unknown;
  }[];
  allocations: { month: number }[];
  budgetPlan?: {
    originOffice?: string | null;
    projectId?: string | null;
    categoryId?: string | null;
    categoryKeyIndexId?: string | null;
    costCenterId?: string | null;
    coaId?: string | null;
    opexType?: string | null;
    opexAllocationId?: string | null;
  } | null;
};

export default function EditBudgetRequestPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const id = params.id as string;
  const userDepartmentId = session?.user?.departmentId ?? '';
  const canCrossDepartment = Boolean(
    session?.user?.access?.activityAccess?.createForOtherDepartment,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [options, setOptions] = useState<BudgetRequestFormOptions>({
    plans: [],
    fiscalYears: [],
    departments: [],
    projects: [],
    originOffices: [],
    approvalSchemas: [],
  });
  const [error, setError] = useState('');
  const errorBannerRef = useRef<HTMLDivElement | null>(null);

  const {
    formData,
    setFormData,
    selectedMonths,
    setSelectedMonths,
    lineItems,
    setLineItems,
    taxConfig,
    setTaxConfig,
    taxSummary,
    isBudgetPlanSelected,
    fieldRefs,
    handlePlanSelect,
  } = useBudgetRequestForm();

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    setLoadError('');

    Promise.all([
      fetch('/api/budget-requests').then((response) => response.json()),
      fetch('/api/workspace-management/approval-schema').then((response) => response.json()),
      fetch('/api/budget-plans/options').then((response) => response.json()),
      fetch(`/api/budget-requests/${id}`).then((response) => (response.ok ? response.json() : null)),
    ])
      .then(([listData, schemaData, budgetPlanOptionsData, budgetRequestData]) => {
        setOptions({
          plans: listData.plans || [],
          approvalSchemas:
            schemaData.schemas?.filter(
              (schema: { type: string }) => schema.type === 'BudgetRequest',
            ) || [],
          fiscalYears: budgetPlanOptionsData.fiscalYears || [],
          departments: budgetPlanOptionsData.departments || [],
          projects: budgetPlanOptionsData.projects || [],
          originOffices: budgetPlanOptionsData.originOffices || [],
        });

        if (!budgetRequestData) {
          setLoadError('Request not found');
          return;
        }

        const data = budgetRequestData as BudgetRequestApi;
        if (session?.user?.id && data.requestorId !== session.user.id) {
          router.replace(`/budget-requests/${id}`);
          return;
        }

        const plan = data.budgetPlan;
        setFormData({
          budgetPlanId: data.budgetPlanId,
          fiscalYear: data.fiscalYear,
          originOffice: plan?.originOffice ?? '',
          departmentId: data.departmentId,
          projectId: plan?.projectId ?? '',
          subject: data.subject,
          description: data.description ?? '',
          notes: data.notes ?? '',
          approvalSchemaId: data.approvalSchemaId ?? '',
          category: plan?.categoryId ?? '',
          categoryKeyIndex: plan?.categoryKeyIndexId ?? '',
          costCenter: plan?.costCenterId ?? '',
          coa: plan?.coaId ?? '',
          type: plan?.opexType ?? '',
          opexAllocation: plan?.opexAllocationId ?? '',
          opexType: plan?.opexType ?? '',
        });
        setSelectedMonths(selectedMonthsFromAllocations(data.allocations));
        setLineItems(
          (data.lineItems || []).length > 0
            ? data.lineItems.map(mapApiLineToEditor)
            : [buildEmptyLineItem()],
        );
        setTaxConfig({
          vatPercent: Number(data.vatPercent ?? 11),
          whtPercent: Number(data.whtPercent ?? 2),
        });
      })
      .catch(() => setLoadError('Failed to load'))
      .finally(() => setIsLoading(false));
  }, [
    id,
    router,
    session?.user?.id,
    sessionStatus,
    setFormData,
    setLineItems,
    setSelectedMonths,
    setTaxConfig,
  ]);

  const reportError = (message: string, field?: keyof typeof fieldRefs) => {
    setError(message);
    notifyFormError(message, { fieldRef: field ? fieldRefs[field] : errorBannerRef });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const validationError = validateBudgetRequestForm({
      formData,
      selectedMonths,
      lineItems,
      totalAmount: taxSummary.totalAmount,
      schemasForDepartment: options.approvalSchemas,
    });

    if (validationError) {
      reportError(validationError.message, validationError.field);
      return;
    }

    const plan = options.plans.find((item) => item.id === formData.budgetPlanId);
    if (!plan) {
      reportError('Invalid budget plan', 'budgetPlan');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/budget-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fiscalYear: formData.fiscalYear,
          selectedMonths,
          vatPercent: taxConfig.vatPercent,
          vatAmount: taxSummary.vatAmount,
          whtPercent: taxConfig.whtPercent,
          whtAmount: taxSummary.whtAmount,
          invoiceAmount: taxSummary.invoiceAmount,
          grandTotal: taxSummary.grandTotal,
          lineItems: buildLineItemsPayload(lineItems),
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        reportError(body.error ?? 'Failed');
        return;
      }

      router.push(`/budget-requests/${id}`);
    } catch {
      reportError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionStatus === 'loading' || isLoading) return <LoadingSpin />;
  if (sessionStatus === 'unauthenticated' || !session?.user?.id) {
    return <div className="text-gray-600">Please sign in to edit this request.</div>;
  }
  if (loadError) return <div className="text-red-600">{loadError}</div>;

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit Budget Request</h1>
      {options.plans.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
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
            <p className="font-semibold">Save failed</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}
      <Card className="p-6">
        <BudgetRequestForm
          mode="edit"
          options={options}
          formData={formData}
          onFormDataChange={setFormData}
          selectedMonths={selectedMonths}
          onSelectedMonthsChange={setSelectedMonths}
          lineItems={lineItems}
          onLineItemsChange={setLineItems}
          taxConfig={taxConfig}
          onTaxConfigChange={setTaxConfig}
          taxSummary={taxSummary}
          isBudgetPlanSelected={isBudgetPlanSelected}
          fieldRefs={fieldRefs}
          onPlanSelect={(planId) => handlePlanSelect(planId, options.plans)}
          userDepartmentId={userDepartmentId}
          canCrossDepartment={canCrossDepartment}
          cancelHref={`/budget-requests/${id}`}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitDisabled={options.plans.length === 0}
        />
      </Card>
    </div>
  );
}
