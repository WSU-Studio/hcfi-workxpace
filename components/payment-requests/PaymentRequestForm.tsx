'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import ButtonLink from '@/components/ui/ButtonLink';
import ApprovalSchemaLevelsPreview from '@/components/approval/ApprovalSchemaLevelsPreview';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import RichTextEditor from '@/components/ui/RichTextEditor';
import DepartmentSelectField from '@/components/forms/DepartmentSelectField';
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
    (isSubmitting ? (mode === 'create' ? 'Submitting...' : 'Saving...') : mode === 'create' ? 'Submit' : 'Save changes');

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="mb-1.5 block font-medium">Approval Schema *</label>
        <Select
          value={formData.approvalSchemaId}
          onChange={(event) =>
            onFormDataChange((previous) => ({
              ...previous,
              approvalSchemaId: event.target.value,
            }))
          }
          required
          aria-invalid={!formData.approvalSchemaId}
        >
          <option value="">-</option>
          {schemasForDept.map((schema) => (
            <option key={schema.id} value={schema.id}>
              {schema.name}
            </option>
          ))}
        </Select>
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
        <label className="mb-1.5 block font-medium">Budget Request (Approved, optional)</label>
        <Select
          value={formData.budgetRequestId}
          onChange={(event) => onBudgetRequestChange(event.target.value)}
        >
          <option value="">-</option>
          {approvedBudgetRequests.map((budgetRequest) => (
            <option key={budgetRequest.id} value={budgetRequest.id}>
              {budgetRequest.code} - {budgetRequest.subject}
            </option>
          ))}
        </Select>
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
            <Select
              value={formData.originOffice}
              onChange={(event) =>
                onFormDataChange((previous) => ({
                  ...previous,
                  originOffice: event.target.value,
                }))
              }
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
          disabled={isSubmitting || submitDisabled}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {resolvedSubmitLabel}
        </button>
      </div>
    </form>
  );
}
