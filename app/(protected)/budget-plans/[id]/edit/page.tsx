'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import BudgetPlanForm from '@/components/budget-plans/BudgetPlanForm';
import { useBudgetPlanForm } from '@/hooks/useBudgetPlanForm';
import { notifyFormError } from '@/lib/forms/feedback';
import {
  allocationsFromPlanRows,
  BudgetPlanFormOptions,
  normalizeSupportingDocs,
  toAllocationPayload,
  uploadBudgetPlanSupportingDocs,
  validateBudgetPlanForm,
} from '@/lib/budget-plans/form';
import { filterSchemasForDepartment } from '@/lib/approval-schema';

export default function EditBudgetPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;
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
  const errorBannerRef = useRef<HTMLDivElement | null>(null);
  const [histories, setHistories] = useState<{
    id: string;
    action: string;
    details: {
      status?: string;
      declineReason?: string | null;
      allocationAdjustmentNote?: string | null;
      currentState?: { allocationAdjustmentNote?: string | null } | null;
    } | null;
    timestamp: string;
    user: { name: string };
  }[]>([]);

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
    existingSupportingDocs,
    setExistingSupportingDocs,
    totalAllocation,
    copyToAll,
    splitEvenly,
    removeExistingSupportingDoc,
    formatAllocationDisplay,
    fieldRefs,
  } = useBudgetPlanForm();

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  useEffect(() => {
    if (!id) return;

    fetch(`/api/budget-plans/${id}`, { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => {
        const plan = data.plan;
        if (plan) {
          setFormData({
            fiscalYear: plan.fiscalYear,
            originOffice: plan.originOffice || '',
            departmentId: plan.departmentId,
            projectId: plan.projectId || '',
            subject: plan.subject,
            description: plan.description || '',
            approvalSchemaId: plan.approvalSchemaId || '',
          });

          const { allocations: planAllocations, selectedMonths: planMonths } =
            allocationsFromPlanRows(plan.allocations);
          setAllocations(planAllocations);
          setSelectedMonths(planMonths);
          setExistingSupportingDocs(normalizeSupportingDocs(plan.supportingDocs));
        }

        setOptions({
          fiscalYears: data.fiscalYears || [],
          departments: data.departments || [],
          projects: data.projects || [],
          originOffices: data.originOffices || [],
          approvalSchemas: data.approvalSchemas || [],
        });
        setHistories(data.histories || []);
      })
      .finally(() => setIsLoading(false));
  }, [id, setAllocations, setExistingSupportingDocs, setFormData, setSelectedMonths]);

  const schemasForDept = filterSchemasForDepartment(options.approvalSchemas, formData.departmentId);

  const reportError = (message: string, field?: keyof typeof fieldRefs) => {
    setError(message);
    notifyFormError(message, { fieldRef: field ? fieldRefs[field] : errorBannerRef });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const validationError = validateBudgetPlanForm({
      formData,
      selectedMonths: selectedMonthsSorted,
      schemasForDepartment: schemasForDept,
      totalAllocation,
    });
    if (validationError) {
      reportError(validationError.message, validationError.field);
      return;
    }

    setIsSubmitting(true);
    try {
      let newlyUploadedDocs: string[] = [];
      if (attachmentFiles.length > 0) {
        setIsUploadingAttachments(true);
        try {
          newlyUploadedDocs = await uploadBudgetPlanSupportingDocs(attachmentFiles);
        } catch (uploadError) {
          reportError(
            uploadError instanceof Error ? uploadError.message : 'Failed to upload supporting documents',
          );
          return;
        } finally {
          setIsUploadingAttachments(false);
        }
      }

      const response = await fetch(`/api/budget-plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          supportingDocs: [...existingSupportingDocs, ...newlyUploadedDocs],
          allocations: toAllocationPayload(selectedMonthsSorted, allocations),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        reportError(typeof body?.error === 'string' ? body.error : 'Failed');
        return;
      }

      router.push(`/budget-plans/${id}`);
    } catch {
      reportError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit Budget Plan</h1>
      {error && (
        <div
          ref={errorBannerRef}
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 shadow-sm"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold">Submission failed</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}
      <Card className="p-6">
        <BudgetPlanForm
          mode="edit"
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
          existingSupportingDocs={existingSupportingDocs}
          onRemoveExistingSupportingDoc={removeExistingSupportingDoc}
          userDepartmentId={userDepartmentId}
          canCrossDepartment={canCrossDepartment}
          fieldRefs={fieldRefs}
          cancelHref={`/budget-plans/${id}`}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isUploadingAttachments={isUploadingAttachments}
        />
      </Card>

      <Card
        className="p-6"
        collapsible
        header={<h3 className="font-medium">Activity History</h3>}
      >
        {histories.length === 0 ? (
          <p className="text-sm text-gray-500">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {histories.map((history) => (
              <div key={history.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                <p>
                  <span className="font-medium">{history.user?.name || 'Unknown User'}</span>{' '}
                  <span className="text-gray-700">{history.action.toLowerCase()}</span>{' '}
                  <span className="text-gray-500">on {formatDateTime(history.timestamp)}</span>
                </p>
                {history.details?.status ? (
                  <p className="text-gray-600">Status: {history.details.status}</p>
                ) : null}
                {history.details?.declineReason ? (
                  <p className="text-red-700">Reason: {history.details.declineReason}</p>
                ) : null}
                {(history.details?.allocationAdjustmentNote ||
                  history.details?.currentState?.allocationAdjustmentNote) ? (
                  <p className="text-amber-700">
                    {history.details?.allocationAdjustmentNote ||
                      history.details?.currentState?.allocationAdjustmentNote}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
