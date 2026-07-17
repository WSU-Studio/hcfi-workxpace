'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import ButtonLink from '@/components/ui/ButtonLink';
import ApprovalSchemaLevelsPreview from '@/components/approval/ApprovalSchemaLevelsPreview';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import RichTextEditor from '@/components/ui/RichTextEditor';
import DepartmentSelectField from '@/components/forms/DepartmentSelectField';
import SupportingDocumentsField from '@/components/forms/SupportingDocumentsField';
import BudgetRequestItemsEditor, {
  type BudgetRequestLineItemInput,
} from '@/components/budget-requests/BudgetRequestItemsEditor';
import RequestClassificationFields from '@/components/classification/RequestClassificationFields';
import type { RequestClassificationValue } from '@/lib/request-classification';
import {
  DESCRIPTION_MAX_BYTES,
  PaymentRequestFormOptions,
  PaymentRequestFormValues,
  PaymentRequestTaxSummary,
} from '@/lib/payment-requests/form';
import { sortApprovalLevels } from '@/lib/approval-schema';

export interface PaymentRequestFormProps {
  mode: 'create' | 'edit';
  options: PaymentRequestFormOptions;
  formData: PaymentRequestFormValues;
  onFormDataChange: React.Dispatch<React.SetStateAction<PaymentRequestFormValues>>;
  lineItems: BudgetRequestLineItemInput[];
  onLineItemsChange: React.Dispatch<React.SetStateAction<BudgetRequestLineItemInput[]>>;
  taxConfig: { vatPercent: number; whtPercent: number };
  onTaxConfigChange: React.Dispatch<React.SetStateAction<{ vatPercent: number; whtPercent: number }>>;
  taxSummary: PaymentRequestTaxSummary;
  classification: RequestClassificationValue;
  onClassificationChange: React.Dispatch<React.SetStateAction<RequestClassificationValue>>;
  isBudgetRequestSelected: boolean;
  onBudgetRequestChange: (budgetRequestId: string) => void;
  userDepartmentId?: string;
  canCrossDepartment?: boolean;
  cancelHref: string;
  onSubmit: (event: React.FormEvent) => void;
  isSubmitting: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  attachmentFiles?: File[];
  onAttachmentFilesChange?: (files: File[]) => void;
  existingSupportingDocs?: string[];
  onRemoveExistingSupportingDoc?: (url: string) => void;
  isUploadingAttachments?: boolean;
}

export default function PaymentRequestForm({
  mode,
  options,
  formData,
  onFormDataChange,
  lineItems,
  onLineItemsChange,
  taxConfig,
  onTaxConfigChange,
  taxSummary,
  classification,
  onClassificationChange,
  isBudgetRequestSelected,
  onBudgetRequestChange,
  userDepartmentId = '',
  canCrossDepartment = false,
  cancelHref,
  onSubmit,
  isSubmitting,
  submitDisabled = false,
  submitLabel,
  attachmentFiles = [],
  onAttachmentFilesChange,
  existingSupportingDocs = [],
  onRemoveExistingSupportingDoc,
  isUploadingAttachments = false,
}: PaymentRequestFormProps) {
  const {
    approvedBudgetRequests,
    fiscalYears,
    departments,
    projects,
    originOffices,
    approvalSchemas,
    categoryOptions,
    categoryKeyIndexOptions,
    costCenterOptions,
    opexAllocationOptions,
    accountOptions,
  } = options;

  const schemasForDept = approvalSchemas.filter(
    (schema) => schema.departmentId === formData.departmentId,
  );

  const budgetRequestOptions = useMemo(
    () => [
      { value: '', label: '—' },
      ...approvedBudgetRequests.map((budgetRequest) => ({
        value: budgetRequest.id,
        label: `${budgetRequest.code} - ${budgetRequest.subject}`,
        searchText: `${budgetRequest.code} ${budgetRequest.subject}`,
      })),
    ],
    [approvedBudgetRequests],
  );

  const originOfficeOptions = useMemo(
    () =>
      originOffices.map((office) => ({
        value: office.code,
        label: `${office.code} - ${office.name}${office.isActive ? '' : ' (Inactive)'}`,
        searchText: `${office.code} ${office.name}`,
      })),
    [originOffices],
  );

  const approvalSchemaOptions = useMemo(
    () =>
      schemasForDept.map((schema) => ({
        value: schema.id,
        label: schema.name,
      })),
    [schemasForDept],
  );

  const selectedApprovalLevels = useMemo(() => {
    if (!formData.approvalSchemaId) return [];
    const selectedSchema = approvalSchemas.find(
      (schema) => schema.id === formData.approvalSchemaId,
    );
    return sortApprovalLevels(selectedSchema?.approvalLevels ?? []);
  }, [approvalSchemas, formData.approvalSchemaId]);

  const fiscalYearOptions =
    fiscalYears.length > 0 ? fiscalYears : [{ year: new Date().getFullYear() }];

  const resolvedSubmitLabel =
    submitLabel ??
    (isUploadingAttachments
      ? 'Uploading documents...'
      : isSubmitting
        ? mode === 'create'
          ? 'Submitting...'
          : 'Saving...'
        : mode === 'create'
          ? 'Submit'
          : 'Save changes');

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="mb-1.5 block font-medium">Budget Request (Approved, optional)</label>
        <SearchableSelect
          value={formData.budgetRequestId}
          options={budgetRequestOptions}
          onChange={onBudgetRequestChange}
          placeholder="Select budget request..."
          searchPlaceholder="Search budget request..."
        />
        {mode === 'create' ? (
          <p className="mt-1 text-sm text-gray-500">
            Link to an approved budget request, or leave blank. When linked, fiscal year, origin office,
            department, and project follow that budget request.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block font-medium">Fiscal Year *</label>
          <Select
            value={formData.fiscalYear}
            onChange={(event) =>
              onFormDataChange((previous) => ({
                ...previous,
                fiscalYear: Number(event.target.value),
              }))
            }
            required
            readonly={isBudgetRequestSelected}
          >
            {fiscalYearOptions.map((fiscalYear) => (
              <option key={fiscalYear.year} value={fiscalYear.year}>
                {fiscalYear.year}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block font-medium">Origin Office *</label>
          {originOffices.length > 0 ? (
            <SearchableSelect
              value={formData.originOffice}
              options={originOfficeOptions}
              onChange={(originOffice) =>
                onFormDataChange((previous) => ({ ...previous, originOffice }))
              }
              required={!isBudgetRequestSelected}
              disabled={isBudgetRequestSelected}
              placeholder="Select origin office..."
              searchPlaceholder="Search origin office..."
            />
          ) : (
            <Input
              type="text"
              value={formData.originOffice}
              onChange={(event) =>
                onFormDataChange((previous) => ({
                  ...previous,
                  originOffice: event.target.value,
                }))
              }
              placeholder="HQ"
              required={!isBudgetRequestSelected}
              readOnly={isBudgetRequestSelected}
            />
          )}
        </div>

        <DepartmentSelectField
          value={formData.departmentId}
          departments={departments}
          userDepartmentId={userDepartmentId}
          canCrossDepartment={canCrossDepartment}
          forcedReadonly={isBudgetRequestSelected}
          onChange={(departmentId) =>
            onFormDataChange((previous) => ({ ...previous, departmentId }))
          }
        />

        <div>
          <label className="mb-1.5 block font-medium">Project</label>
          <Select
            value={formData.projectId}
            onChange={(event) =>
              onFormDataChange((previous) => ({
                ...previous,
                projectId: event.target.value,
              }))
            }
            readonly={isBudgetRequestSelected}
          >
            <option value="">-</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block font-medium">Vendor Invoice No</label>
          <Input
            type="text"
            value={formData.vendorInvoiceNo}
            onChange={(event) =>
              onFormDataChange((previous) => ({
                ...previous,
                vendorInvoiceNo: event.target.value,
              }))
            }
            placeholder="Vendor invoice number"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-medium">Date Needed</label>
          <Input
            type="date"
            value={formData.dateNeeded}
            onChange={(event) =>
              onFormDataChange((previous) => ({
                ...previous,
                dateNeeded: event.target.value,
              }))
            }
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block font-medium">Subject *</label>
        <Input
          type="text"
          value={formData.subject}
          onChange={(event) =>
            onFormDataChange((previous) => ({
              ...previous,
              subject: event.target.value,
            }))
          }
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block font-medium">Description</label>
        <RichTextEditor
          value={formData.description}
          onChange={(description) =>
            onFormDataChange((previous) => ({ ...previous, description }))
          }
          placeholder="Describe the payment request..."
          maxContentBytes={DESCRIPTION_MAX_BYTES}
        />
      </div>

      {onAttachmentFilesChange ? (
        <SupportingDocumentsField
          attachmentFiles={attachmentFiles}
          onAttachmentFilesChange={onAttachmentFilesChange}
          existingSupportingDocs={existingSupportingDocs}
          onRemoveExistingSupportingDoc={onRemoveExistingSupportingDoc}
          disabled={isSubmitting || isUploadingAttachments}
        />
      ) : null}

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Request Allocation</h2>
        <BudgetRequestItemsEditor
          items={lineItems}
          onChange={onLineItemsChange}
          taxConfig={taxConfig}
          onTaxChange={onTaxConfigChange}
          summary={{
            transactionAmount: taxSummary.totalAmount,
            vatAmount: taxSummary.vatAmount,
            whtAmount: taxSummary.whtAmount,
            invoiceAmount: taxSummary.invoiceAmount,
            grandTotal: taxSummary.grandTotal,
          }}
        />
      </div>

      <div className="space-y-3 hidden">
        <h2 className="text-base font-semibold text-gray-900">Classification</h2>
        <RequestClassificationFields
          value={classification}
          onChange={onClassificationChange}
          categoryOptions={categoryOptions}
          categoryKeyIndexOptions={categoryKeyIndexOptions}
          costCenterOptions={costCenterOptions}
          opexAllocationOptions={opexAllocationOptions}
          accountOptions={accountOptions}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="col-span-2">
          <label className="mb-1.5 block font-medium">Payee *</label>
          <Input
            type="text"
            value={formData.payeeName}
            onChange={(event) =>
              onFormDataChange((previous) => ({
                ...previous,
                payeeName: event.target.value,
              }))
            }
            placeholder="Vendor or beneficiary name"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block font-medium">Bank Account</label>
          <Input
            type="text"
            value={formData.bankAccount}
            onChange={(event) =>
              onFormDataChange((previous) => ({
                ...previous,
                bankAccount: event.target.value,
              }))
            }
            placeholder="Bank account number"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-medium">Currency</label>
          <Input
            type="text"
            value={formData.currency}
            onChange={(event) =>
              onFormDataChange((previous) => ({
                ...previous,
                currency: event.target.value.toUpperCase(),
              }))
            }
            maxLength={8}
            readOnly
            className="max-w-xs"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block font-medium">Payment purpose</label>
        <Input
          type="text"
          value={formData.paymentPurpose}
          onChange={(event) =>
            onFormDataChange((previous) => ({
              ...previous,
              paymentPurpose: event.target.value,
            }))
          }
          placeholder="Invoice ref., period, etc."
        />
      </div>

      <div>
        <label className="mb-1.5 block font-medium">Approval Schema *</label>
        <SearchableSelect
          value={formData.approvalSchemaId}
          options={approvalSchemaOptions}
          onChange={(approvalSchemaId) =>
            onFormDataChange((previous) => ({ ...previous, approvalSchemaId }))
          }
          required
          placeholder="Select approval schema..."
          searchPlaceholder="Search approval schema..."
        />
        {formData.departmentId && schemasForDept.length === 0 ? (
          <p className="mt-1.5 text-xs text-amber-600">
            No approval schema is configured for the selected department.
          </p>
        ) : null}
        {formData.approvalSchemaId ? (
          <ApprovalSchemaLevelsPreview levels={selectedApprovalLevels} className="mt-3" />
        ) : null}
      </div>

      <div>
        <label className="mb-1.5 block font-medium">Notes</label>
        <Input
          type="text"
          value={formData.notes}
          onChange={(event) =>
            onFormDataChange((previous) => ({
              ...previous,
              notes: event.target.value,
            }))
          }
        />
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <ButtonLink href={cancelHref} variant="outline">
          <X className="h-4 w-4" />
          Cancel
        </ButtonLink>
        <button
          type="submit"
          disabled={isSubmitting || isUploadingAttachments || submitDisabled}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {resolvedSubmitLabel}
        </button>
      </div>
    </form>
  );
}
