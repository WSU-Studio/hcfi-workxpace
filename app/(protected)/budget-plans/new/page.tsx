'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import BudgetPlanForm from '@/components/budget-plans/BudgetPlanForm';
import { useBudgetPlanForm } from '@/hooks/useBudgetPlanForm';
import {
  BudgetPlanFormOptions,
  toAllocationPayload,
  uploadBudgetPlanSupportingDocs,
  validateBudgetPlanForm,
} from '@/lib/budget-plans/form';
import { resolvePreferredDepartmentId } from '@/lib/access/cross-department';

export default function NewBudgetPlanPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const userDepartmentId = session?.user?.departmentId ?? '';
  const canCrossDepartment = Boolean(
    session?.user?.access?.activityAccess?.createForOtherDepartment,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [options, setOptions] = useState<BudgetPlanFormOptions>({
    fiscalYears: [],
    departments: [],
    projects: [],
    originOffices: [],
    approvalSchemas: [],
  });
  const [error, setError] = useState('');

  const {
    formData,
    setFormData,
    allocations,
    setAllocations,
    selectedMonths,
    setSelectedMonths,
    selectedMonthsSorted,
    baseAmount,
    setBaseAmount,
    attachmentFiles,
    setAttachmentFiles,
    totalAllocation,
    copyToAll,
    splitEvenly,
    formatAllocationDisplay,
  } = useBudgetPlanForm();

  useEffect(() => {
    fetch('/api/budget-plans/options')
      .then((response) => response.json())
      .then((data) => {
        setOptions({
          fiscalYears: data.fiscalYears || [],
          departments: data.departments || [],
          projects: data.projects || [],
          approvalSchemas: data.approvalSchemas || [],
          originOffices: data.originOffices || [],
        });

        if (data.fiscalYears?.[0]) {
          setFormData((previous) => ({ ...previous, fiscalYear: data.fiscalYears[0].year }));
        }
        if (data.projects?.[0]) {
          setFormData((previous) => ({ ...previous, projectId: data.projects[0].id }));
        }
        if (data.originOffices?.length) {
          const activeFirst =
            data.originOffices.find((office: { isActive: boolean }) => office.isActive) ||
            data.originOffices[0];
          setFormData((previous) => ({ ...previous, originOffice: activeFirst.code }));
        } else {
          setFormData((previous) => ({ ...previous, originOffice: 'HQ' }));
        }
      })
      .finally(() => setIsLoading(false));
  }, [setFormData]);

  // Seed / lock Department after session resolves so we never flash another dept
  // (e.g. alphabetically-first ACCOUNTING) before the user's own department is known.
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (options.departments.length === 0) return;

    const preferredDepartmentId = resolvePreferredDepartmentId(
      options.departments,
      userDepartmentId,
    );
    if (!preferredDepartmentId) return;

    setFormData((previous) => {
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
  const schemasForDept = options.approvalSchemas.filter(
    (schema) => schema.departmentId === formData.departmentId,
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const validationError = validateBudgetPlanForm({
      formData,
      selectedMonths: selectedMonthsSorted,
      schemasForDepartment: schemasForDept,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      let supportingDocs: string[] = [];
      if (attachmentFiles.length > 0) {
        setIsUploadingAttachments(true);
        try {
          supportingDocs = await uploadBudgetPlanSupportingDocs(attachmentFiles);
        } catch (uploadError) {
          setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload supporting documents');
          return;
        } finally {
          setIsUploadingAttachments(false);
        }
      }

      const response = await fetch('/api/budget-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          supportingDocs,
          allocations: toAllocationPayload(selectedMonthsSorted, allocations),
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        setError(body.error ?? 'Failed');
        return;
      }

      router.push('/budget-plans');
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Budget Plan</h1>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>
      )}
      <Card className="p-6">
        <BudgetPlanForm
          mode="create"
          options={options}
          formData={formData}
          onFormDataChange={setFormData}
          allocations={allocations}
          onAllocationsChange={setAllocations}
          selectedMonths={selectedMonths}
          onSelectedMonthsChange={setSelectedMonths}
          selectedMonthsSorted={selectedMonthsSorted}
          baseAmount={baseAmount}
          onBaseAmountChange={setBaseAmount}
          totalAllocation={totalAllocation}
          onCopyToAll={copyToAll}
          onSplitEvenly={splitEvenly}
          formatAllocationDisplay={formatAllocationDisplay}
          attachmentFiles={attachmentFiles}
          onAttachmentFilesChange={setAttachmentFiles}
          userDepartmentId={userDepartmentId}
          canCrossDepartment={canCrossDepartment}
          cancelHref="/budget-plans"
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isUploadingAttachments={isUploadingAttachments}
        />
      </Card>
    </div>
  );
}
