'use client';

import { useRef, useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import BudgetRequestForm from '@/components/budget-requests/BudgetRequestForm';
import { useBudgetRequestForm } from '@/hooks/useBudgetRequestForm';
import { useSupportingDocuments } from '@/hooks/useSupportingDocuments';
import { useRefreshSessionAccessOnce } from '@/hooks/useRefreshSessionAccessOnce';
import { notifyFormError } from '@/lib/forms/feedback';
import { supportingDocsForPersistence } from '@/lib/supporting-docs';
import {
  BudgetRequestFormOptions,
  buildLineItemsPayload,
  validateBudgetRequestForm,
} from '@/lib/budget-requests/form';
import { resolvePreferredDepartmentId } from '@/lib/access/cross-department';

export default function NewBudgetRequestClient() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  useRefreshSessionAccessOnce();
  const userDepartmentId = session?.user?.departmentId ?? '';
  const canCrossDepartment = Boolean(
    session?.user?.access?.activityAccess?.createForOtherDepartment,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const {
    attachmentFiles,
    setAttachmentFiles,
    existingSupportingDocs,
    removeExistingSupportingDoc,
    resolveSupportingDocs,
    isUploadingAttachments,
  } = useSupportingDocuments();

  useEffect(() => {
    Promise.all([
      fetch('/api/budget-requests').then((response) => response.json()),
      fetch('/api/workspace-management/approval-schema').then((response) => response.json()),
      fetch('/api/budget-plans/options').then((response) => response.json()),
    ])
      .then(([budgetRequestData, approvalSchemaData, budgetPlanOptionsData]) => {
        const nextFiscalYears = budgetPlanOptionsData.fiscalYears || [];
        const nextDepartments = budgetPlanOptionsData.departments || [];
        const nextProjects = budgetPlanOptionsData.projects || [];
        const nextOriginOffices = budgetPlanOptionsData.originOffices || [];

        setOptions({
          plans: budgetRequestData.plans || [],
          approvalSchemas:
            approvalSchemaData.schemas?.filter(
              (schema: { type: string }) => schema.type === 'BudgetRequest',
            ) || [],
          fiscalYears: nextFiscalYears,
          departments: nextDepartments,
          projects: nextProjects,
          originOffices: nextOriginOffices,
        });

        setFormData((previous) => ({
          ...previous,
          fiscalYear: nextFiscalYears?.[0]?.year ?? previous.fiscalYear,
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
  }, [setFormData]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (options.departments.length === 0) return;

    const preferredDepartmentId = resolvePreferredDepartmentId(
      options.departments,
      userDepartmentId,
    );
    if (!preferredDepartmentId) return;

    setFormData((previous) => {
      if (previous.budgetPlanId) return previous;
      if (!canCrossDepartment) {
        return previous.departmentId === preferredDepartmentId
          ? previous
          : { ...previous, departmentId: preferredDepartmentId };
      }
      if (previous.departmentId) return previous;
      return { ...previous, departmentId: preferredDepartmentId };
    });
  }, [
    sessionStatus,
    canCrossDepartment,
    userDepartmentId,
    options.departments,
    setFormData,
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

    setIsSubmitting(true);
    try {
      let supportingDocs: string[] = [];
      try {
        supportingDocs = await resolveSupportingDocs('budget-requests');
      } catch (uploadError) {
        reportError(
          uploadError instanceof Error ? uploadError.message : 'Failed to upload supporting documents',
        );
        return;
      }

      const response = await fetch('/api/budget-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fiscalYear: formData.fiscalYear,
          departmentId: formData.departmentId,
          selectedMonths,
          vatPercent: taxConfig.vatPercent,
          vatAmount: taxSummary.vatAmount,
          whtPercent: taxConfig.whtPercent,
          whtAmount: taxSummary.whtAmount,
          invoiceAmount: taxSummary.invoiceAmount,
          grandTotal: taxSummary.grandTotal,
          lineItems: buildLineItemsPayload(lineItems),
          supportingDocs: supportingDocsForPersistence(supportingDocs),
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        reportError(body.error ?? 'Failed to submit budget request');
        return;
      }

      const data = await response.json();
      router.push(`/budget-requests/${data.id}`);
    } catch {
      reportError('Failed to submit budget request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Budget Request</h1>
      {options.plans.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          No approved budget plans available. You can still submit an unplanned budget request without linking a plan.
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
        <BudgetRequestForm
          mode="create"
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
          cancelHref="/budget-requests"
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          attachmentFiles={attachmentFiles}
          onAttachmentFilesChange={setAttachmentFiles}
          existingSupportingDocs={existingSupportingDocs}
          onRemoveExistingSupportingDoc={removeExistingSupportingDoc}
          isUploadingAttachments={isUploadingAttachments}
        />
      </Card>
    </div>
  );
}
