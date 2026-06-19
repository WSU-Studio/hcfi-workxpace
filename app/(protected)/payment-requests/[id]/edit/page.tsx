'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import PaymentRequestForm from '@/components/payment-requests/PaymentRequestForm';
import { usePaymentRequestForm } from '@/hooks/usePaymentRequestForm';
import {
  buildEmptyLineItem,
  buildPaymentRequestSubmitPayload,
  classificationFromPaymentRequestRow,
  mapPaymentRequestLineToEditor,
  PaymentRequestFormOptions,
  validatePaymentRequestForm,
} from '@/lib/payment-requests/form';

type PaymentRequestApi = {
  id: string;
  subject: string;
  description: string | null;
  notes: string | null;
  approvalSchemaId: string | null;
  budgetRequestId: string | null;
  fiscalYear: number;
  originOffice: string | null;
  departmentId: string;
  projectId: string | null;
  currency: string | null;
  payeeName: string | null;
  bankAccount: string | null;
  paymentPurpose: string | null;
  requestorId: string | null;
  vatPercent?: unknown;
  whtPercent?: unknown;
  category?: string | null;
  categoryKeyIndex?: string | null;
  costCenter?: string | null;
  coa?: string | null;
  type?: string | null;
  opexAllocation?: string | null;
  opexType?: string | null;
  lineItems: {
    id: string;
    item: string;
    qty: number;
    unitPrice: unknown;
    deduction?: unknown;
  }[];
};

export default function EditPaymentRequestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session, status: sessionStatus } = useSession();
  const userDepartmentId = session?.user?.departmentId ?? '';
  const canCrossDepartment = Boolean(
    session?.user?.access?.activityAccess?.createForOtherDepartment,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [options, setOptions] = useState<PaymentRequestFormOptions>({
    approvedBudgetRequests: [],
    fiscalYears: [],
    departments: [],
    projects: [],
    originOffices: [],
    approvalSchemas: [],
    categoryOptions: [],
    categoryKeyIndexOptions: [],
    costCenterOptions: [],
    opexAllocationOptions: [],
    accountOptions: [],
  });
  const [error, setError] = useState('');

  const {
    formData,
    setFormData,
    lineItems,
    setLineItems,
    taxConfig,
    setTaxConfig,
    taxSummary,
    classification,
    setClassification,
    isBudgetRequestSelected,
    handleBudgetRequestChange,
  } = usePaymentRequestForm();

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    setLoadError('');

    Promise.all([
      fetch('/api/payment-requests').then((response) => response.json()),
      fetch('/api/workspace-management/approval-schema').then((response) => response.json()),
      fetch('/api/budget-plans/options').then((response) => response.json()),
      fetch(`/api/payment-requests/${id}`).then((response) => (response.ok ? response.json() : null)),
    ])
      .then(([prListData, approvalSchemaData, optionsData, row]) => {
        setOptions({
          approvedBudgetRequests: prListData.approvedBudgetRequests || [],
          approvalSchemas:
            approvalSchemaData.schemas?.filter(
              (schema: { type: string }) => schema.type === 'PaymentRequest',
            ) || [],
          fiscalYears: optionsData.fiscalYears || [],
          departments: optionsData.departments || [],
          projects: optionsData.projects || [],
          originOffices: optionsData.originOffices || [],
          categoryOptions: optionsData.categoryOptions || [],
          categoryKeyIndexOptions: optionsData.categoryKeyIndexOptions || [],
          costCenterOptions: optionsData.costCenterOptions || [],
          opexAllocationOptions: optionsData.opexAllocationOptions || [],
          accountOptions: optionsData.accountOptions || [],
        });

        if (!row) {
          setLoadError('Request not found');
          return;
        }

        const data = row as PaymentRequestApi;
        if (session?.user?.id && data.requestorId !== session.user.id) {
          router.replace(`/payment-requests/${id}`);
          return;
        }

        setFormData({
          subject: data.subject ?? '',
          description: data.description ?? '',
          notes: data.notes ?? '',
          approvalSchemaId: data.approvalSchemaId ?? '',
          budgetRequestId: data.budgetRequestId ?? '',
          fiscalYear: data.fiscalYear ?? new Date().getFullYear(),
          originOffice: data.originOffice ?? '',
          departmentId: data.departmentId ?? '',
          projectId: data.projectId ?? '',
          currency: data.currency ?? 'IDR',
          payeeName: data.payeeName ?? '',
          bankAccount: data.bankAccount ?? '',
          paymentPurpose: data.paymentPurpose ?? '',
        });
        setLineItems(
          Array.isArray(data.lineItems) && data.lineItems.length > 0
            ? data.lineItems.map(mapPaymentRequestLineToEditor)
            : [buildEmptyLineItem()],
        );
        setTaxConfig({
          vatPercent: Number(data.vatPercent ?? 11),
          whtPercent: Number(data.whtPercent ?? 2),
        });
        setClassification(classificationFromPaymentRequestRow(data));
      })
      .catch(() => setLoadError('Failed to load'))
      .finally(() => setIsLoading(false));
  }, [
    id,
    router,
    session?.user?.id,
    sessionStatus,
    setClassification,
    setFormData,
    setLineItems,
    setTaxConfig,
  ]);

  const schemasForDept = options.approvalSchemas.filter(
    (schema) => schema.departmentId === formData.departmentId,
  );

  const budgetRequestContext = {
    approvedBudgetRequests: options.approvedBudgetRequests,
    fiscalYears: options.fiscalYears,
    departments: options.departments,
    projects: options.projects,
    originOffices: options.originOffices,
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const validationError = validatePaymentRequestForm({
      formData,
      lineItems,
      totalAmount: taxSummary.totalAmount,
      schemasForDepartment: schemasForDept,
      isBudgetRequestSelected,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/payment-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildPaymentRequestSubmitPayload(formData, lineItems, taxConfig, taxSummary, classification),
        ),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit Payment Request</h1>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>
      ) : null}

      <Card className="p-6">
        <PaymentRequestForm
          mode="edit"
          options={options}
          formData={formData}
          onFormDataChange={setFormData}
          lineItems={lineItems}
          onLineItemsChange={setLineItems}
          taxConfig={taxConfig}
          onTaxConfigChange={setTaxConfig}
          taxSummary={taxSummary}
          classification={classification}
          onClassificationChange={setClassification}
          isBudgetRequestSelected={isBudgetRequestSelected}
          onBudgetRequestChange={(budgetRequestId) =>
            handleBudgetRequestChange(
              budgetRequestId,
              budgetRequestContext,
              options.approvedBudgetRequests,
            )
          }
          userDepartmentId={userDepartmentId}
          canCrossDepartment={canCrossDepartment}
          cancelHref={`/payment-requests/${id}`}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitDisabled={options.departments.length === 0}
        />
      </Card>
    </div>
  );
}
