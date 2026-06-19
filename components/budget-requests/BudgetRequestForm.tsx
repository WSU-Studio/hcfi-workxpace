'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import ButtonLink from '@/components/ui/ButtonLink';
import ApprovalSchemaLevelsPreview from '@/components/approval/ApprovalSchemaLevelsPreview';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import RichTextEditor from '@/components/ui/RichTextEditor';
import MonthChecklistSelector from '@/components/ui/MonthChecklistSelector';
import DepartmentSelectField from '@/components/forms/DepartmentSelectField';
import BudgetRequestItemsEditor, {
  type BudgetRequestLineItemInput,
} from '@/components/budget-requests/BudgetRequestItemsEditor';
import {
  BudgetRequestFormOptions,
  BudgetRequestFormValues,
  BudgetRequestTaxSummary,
  DESCRIPTION_MAX_BYTES,
} from '@/lib/budget-requests/form';
import { sortApprovalLevels } from '@/lib/approval-schema';
import type { BudgetRequestFieldRefs } from '@/hooks/useBudgetRequestForm';

export interface BudgetRequestFormProps {
  mode: 'create' | 'edit';
  options: BudgetRequestFormOptions;
  formData: BudgetRequestFormValues;
  onFormDataChange: React.Dispatch<React.SetStateAction<BudgetRequestFormValues>>;
  selectedMonths: number[];
  onSelectedMonthsChange: React.Dispatch<React.SetStateAction<number[]>>;
  lineItems: BudgetRequestLineItemInput[];
  onLineItemsChange: React.Dispatch<React.SetStateAction<BudgetRequestLineItemInput[]>>;
  taxConfig: { vatPercent: number; whtPercent: number };
  onTaxConfigChange: React.Dispatch<React.SetStateAction<{ vatPercent: number; whtPercent: number }>>;
  taxSummary: BudgetRequestTaxSummary;
  isBudgetPlanSelected: boolean;
  fieldRefs: BudgetRequestFieldRefs;
  onPlanSelect: (planId: string) => void;
  userDepartmentId?: string;
  canCrossDepartment?: boolean;
  cancelHref: string;
  onSubmit: (event: React.FormEvent) => void;
  isSubmitting: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
}

export default function BudgetRequestForm({
  mode,
  options,
  formData,
  onFormDataChange,
  selectedMonths,
  onSelectedMonthsChange,
  lineItems,
  onLineItemsChange,
  taxConfig,
  onTaxConfigChange,
  taxSummary,
  isBudgetPlanSelected,
  fieldRefs,
  onPlanSelect,
  userDepartmentId = '',
  canCrossDepartment = false,
  cancelHref,
  onSubmit,
  isSubmitting,
  submitDisabled = false,
  submitLabel,
}: BudgetRequestFormProps) {
  const { plans, fiscalYears, departments, projects, originOffices, approvalSchemas } = options;
  const schemasForDept = approvalSchemas.filter(
    (schema) => schema.departmentId === formData.departmentId,
  );
  const selectedPlan = plans.find((plan) => plan.id === formData.budgetPlanId);

  const selectedApprovalLevels = useMemo(() => {
    if (!formData.approvalSchemaId) return [];
    const selectedSchema = approvalSchemas.find(
      (schema) => schema.id === formData.approvalSchemaId,
    );
    return sortApprovalLevels(selectedSchema?.approvalLevels ?? []);
  }, [approvalSchemas, formData.approvalSchemaId]);

  const resolvedSubmitLabel =
    submitLabel ?? (isSubmitting ? (mode === 'create' ? 'Submitting...' : 'Saving...') : mode === 'create' ? 'Submit' : 'Save changes');

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div ref={fieldRefs.budgetPlan}>
        <label className="block mb-1.5 font-medium">Budget Plan (Approved) *</label>
        <Select
          value={formData.budgetPlanId}
          onChange={(event) => onPlanSelect(event.target.value)}
          required
        >
          <option value="">-</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.code} - {plan.subject} - {plan.fiscalYear}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block mb-1.5 font-medium">Fiscal Year *</label>
          <Select
            value={formData.fiscalYear}
            onChange={(event) =>
              onFormDataChange((previous) => ({
                ...previous,
                fiscalYear: Number(event.target.value),
              }))
            }
            required
            readonly={isBudgetPlanSelected}
          >
            {fiscalYears.map((fiscalYear) => (
              <option key={fiscalYear.year} value={fiscalYear.year}>
                {fiscalYear.year}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block mb-1.5 font-medium">Origin Office *</label>
          {originOffices.length > 0 ? (
            <Select
              value={formData.originOffice}
              onChange={(event) =>
                onFormDataChange((previous) => ({
                  ...previous,
                  originOffice: event.target.value,
                }))
              }
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
              onChange={(event) =>
                onFormDataChange((previous) => ({
                  ...previous,
                  originOffice: event.target.value,
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
            onFormDataChange((previous) => ({ ...previous, departmentId }))
          }
        />

        <div>
          <label className="block mb-1.5 font-medium">Project</label>
          <Select
            value={formData.projectId}
            onChange={(event) =>
              onFormDataChange((previous) => ({
                ...previous,
                projectId: event.target.value,
              }))
            }
            readonly={isBudgetPlanSelected}
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

      <div ref={fieldRefs.subject}>
        <label className="block mb-1.5 font-medium">Subject *</label>
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

      <div ref={fieldRefs.description}>
        <label className="block mb-1.5 font-medium">Description</label>
        <RichTextEditor
          value={formData.description}
          onChange={(description) =>
            onFormDataChange((previous) => ({ ...previous, description }))
          }
          placeholder="Describe budget request details..."
          maxContentBytes={DESCRIPTION_MAX_BYTES}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 hidden">
        <h2 className="text-base font-semibold text-gray-900">Classification (Default from Budget Plan)</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-1 text-sm text-gray-600">Category</label>
            <p className="rounded-lg border bg-white px-3 py-2 text-sm">
              {selectedPlan?.category?.name ?? '-'}
            </p>
          </div>
          <div>
            <label className="block mb-1 text-sm text-gray-600">Cost Center</label>
            <p className="rounded-lg border bg-white px-3 py-2 text-sm">
              {selectedPlan?.costCenter?.name ?? '-'}
            </p>
          </div>
          <div>
            <label className="block mb-1 text-sm text-gray-600">Category Key Index</label>
            <p className="rounded-lg border bg-white px-3 py-2 text-sm">
              {selectedPlan?.categoryKeyIndex?.name ?? '-'}
            </p>
          </div>
          <div>
            <label className="block mb-1 text-sm text-gray-600">Type</label>
            <p className="rounded-lg border bg-white px-3 py-2 text-sm">{formData.opexType || '-'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Request Allocation</h2>
        <div ref={fieldRefs.months}>
          <label className="mb-2 block font-medium">Month / Period Allocation *</label>
          <MonthChecklistSelector
            selectedMonths={selectedMonths}
            onChange={onSelectedMonthsChange}
            showSelectAll
          />
        </div>
      </div>

      <div ref={fieldRefs.items} className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Items</h2>
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

      <div ref={fieldRefs.approvalSchema}>
        <label className="block mb-1.5 font-medium">Approval Schema *</label>
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
        <label className="block mb-1.5 font-medium">Notes</label>
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

      <div className="flex justify-end gap-3 pt-4 border-t">
        <ButtonLink href={cancelHref} variant="outline">
          <X className="w-4 h-4" />
          Cancel
        </ButtonLink>
        <button
          type="submit"
          disabled={isSubmitting || submitDisabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {resolvedSubmitLabel}
        </button>
      </div>
    </form>
  );
}
