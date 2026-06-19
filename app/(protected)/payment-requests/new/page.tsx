'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import PaymentRequestForm from '@/components/payment-requests/PaymentRequestForm';
import { usePaymentRequestForm } from '@/hooks/usePaymentRequestForm';
import {
  buildPaymentRequestSubmitPayload,
  getDefaultOriginOffice,
  PaymentRequestFormOptions,
  validatePaymentRequestForm,
} from '@/lib/payment-requests/form';

export default function NewPaymentRequestPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userDepartmentId = session?.user?.departmentId ?? '';
  const canCrossDepartment = Boolean(
    session?.user?.access?.activityAccess?.createForOtherDepartment,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [prListFetchWarning, setPrListFetchWarning] = useState('');

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
    Promise.all([
      fetch('/api/payment-requests').then((response) => response.json()),
      fetch('/api/workspace-management/approval-schema').then((response) => response.json()),
      fetch('/api/budget-plans/options').then((response) => response.json()),
    ])
      .then(([prData, approvalSchemaData, optionsData]) => {
        const nextFiscalYears = optionsData.fiscalYears || [];
        const nextDepartments = optionsData.departments || [];
        const nextProjects = optionsData.projects || [];
        const nextOriginOffices = optionsData.originOffices || [];

        setOptions({
          approvedBudgetRequests: prData.approvedBudgetRequests || [],
          approvalSchemas:
            approvalSchemaData.schemas?.filter(
              (schema: { type: string }) => schema.type === 'PaymentRequest',
            ) || [],
          fiscalYears: nextFiscalYears,
          departments: nextDepartments,
          projects: nextProjects,
          originOffices: nextOriginOffices,
          categoryOptions: optionsData.categoryOptions || [],
          categoryKeyIndexOptions: optionsData.categoryKeyIndexOptions || [],
          costCenterOptions: optionsData.costCenterOptions || [],
          opexAllocationOptions: optionsData.opexAllocationOptions || [],
          accountOptions: optionsData.accountOptions || [],
        });

        setPrListFetchWarning(
          typeof prData.listError === 'string' && prData.listError.trim() !== ''
            ? prData.listError
            : '',
        );

        setFormData((previous) => ({
          ...previous,
          fiscalYear: nextFiscalYears?.[0]?.year ?? previous.fiscalYear,
          departmentId: nextDepartments?.[0]?.id ?? previous.departmentId,
          projectId: nextProjects?.[0]?.id ?? previous.projectId,
          originOffice: getDefaultOriginOffice(nextOriginOffices),
        }));
      })
      .finally(() => setIsLoading(false));
  }, [setFormData]);

  useEffect(() => {
    if (canCrossDepartment) return;
    if (!userDepartmentId) return;
    if (options.departments.length === 0) return;
    setFormData((previous) => {
      if (previous.budgetRequestId) return previous;
      return previous.departmentId === userDepartmentId
        ? previous
        : { ...previous, departmentId: userDepartmentId };
    });
  }, [canCrossDepartment, userDepartmentId, options.departments, setFormData]);

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
      const response = await fetch('/api/payment-requests', {
        method: 'POST',
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
      router.push(`/payment-requests/${data.id}`);
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Payment Request</h1>
      {options.departments.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          No departments configured. Add a department in workspace management first.
        </div>
      )}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>
      ) : null}
      {prListFetchWarning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
          {prListFetchWarning} Budget request linking below should still work. If the problem persists,
          check the server log and database migrations for payment requests.
        </div>
      ) : null}

      <Card className="p-6">
        <PaymentRequestForm
          mode="create"
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
          cancelHref="/payment-requests"
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitDisabled={options.departments.length === 0}
        />
      </Card>
    </div>
  );
}
