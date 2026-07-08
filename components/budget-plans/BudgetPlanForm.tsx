'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import ButtonLink from '@/components/ui/ButtonLink';
import ApprovalSchemaLevelsPreview from '@/components/approval/ApprovalSchemaLevelsPreview';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import RichTextEditor from '@/components/ui/RichTextEditor';
import MonthChecklistSelector from '@/components/ui/MonthChecklistSelector';
import {
  Table,
  TableBodyRow,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderRow,
} from '@/components/ui/Table';
import DepartmentSelectField from '@/components/forms/DepartmentSelectField';
import SearchableSelect from '@/components/ui/SearchableSelect';
import {
  BudgetPlanFormOptions,
  BudgetPlanFormValues,
  DESCRIPTION_MAX_BYTES,
  MONTH_NAMES,
} from '@/lib/budget-plans/form';
import { sortApprovalLevels } from '@/lib/approval-schema';

export interface BudgetPlanFormProps {
  mode: 'create' | 'edit';
  options: BudgetPlanFormOptions;
  formData: BudgetPlanFormValues;
  onFormDataChange: React.Dispatch<React.SetStateAction<BudgetPlanFormValues>>;
  allocations: Record<number, number>;
  onAllocationsChange: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  selectedMonths: number[];
  onSelectedMonthsChange: React.Dispatch<React.SetStateAction<number[]>>;
  selectedMonthsSorted: number[];
  baseAmount: string;
  onBaseAmountChange: React.Dispatch<React.SetStateAction<string>>;
  totalAllocation: number;
  onCopyToAll: () => void;
  onSplitEvenly: () => void;
  formatAllocationDisplay: (amount: number) => string;
  attachmentFiles: File[];
  onAttachmentFilesChange: React.Dispatch<React.SetStateAction<File[]>>;
  existingSupportingDocs?: string[];
  onRemoveExistingSupportingDoc?: (url: string) => void;
  userDepartmentId?: string;
  canCrossDepartment?: boolean;
  cancelHref: string;
  onSubmit: (event: React.FormEvent) => void;
  isSubmitting: boolean;
  isUploadingAttachments?: boolean;
  submitLabel?: string;
}

export default function BudgetPlanForm({
  mode,
  options,
  formData,
  onFormDataChange,
  allocations,
  onAllocationsChange,
  selectedMonths,
  onSelectedMonthsChange,
  selectedMonthsSorted,
  baseAmount,
  onBaseAmountChange,
  totalAllocation,
  onCopyToAll,
  onSplitEvenly,
  formatAllocationDisplay,
  attachmentFiles,
  onAttachmentFilesChange,
  existingSupportingDocs = [],
  onRemoveExistingSupportingDoc,
  userDepartmentId = '',
  canCrossDepartment = false,
  cancelHref,
  onSubmit,
  isSubmitting,
  isUploadingAttachments = false,
  submitLabel,
}: BudgetPlanFormProps) {
  const { fiscalYears, departments, projects, originOffices, approvalSchemas } = options;
  const schemasForDept = approvalSchemas.filter(
    (schema) => schema.departmentId === formData.departmentId,
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

  const projectOptions = useMemo(
    () => [
      { value: '', label: '—' },
      ...projects.map((project) => ({
        value: project.id,
        label: `${project.code} - ${project.name}`,
        searchText: `${project.code} ${project.name}`,
      })),
    ],
    [projects],
  );

  const selectedApprovalLevels = useMemo(() => {
    if (!formData.approvalSchemaId) return [];
    const selectedSchema = approvalSchemas.find(
      (schema) => schema.id === formData.approvalSchemaId,
    );
    return sortApprovalLevels(selectedSchema?.approvalLevels ?? []);
  }, [approvalSchemas, formData.approvalSchemaId]);

  const resolvedSubmitLabel =
    submitLabel ??
    (isUploadingAttachments ? 'Uploading documents...' : isSubmitting ? 'Saving...' : mode === 'create' ? 'Submit' : 'Save');

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          {originOffices.length === 0 ? (
            <Input
              value={formData.originOffice}
              onChange={(event) =>
                onFormDataChange((previous) => ({ ...previous, originOffice: event.target.value }))
              }
              placeholder="HQ"
              required
            />
          ) : (
            <SearchableSelect
              value={formData.originOffice}
              options={originOfficeOptions}
              onChange={(originOffice) =>
                onFormDataChange((previous) => ({ ...previous, originOffice }))
              }
              placeholder="Search origin office..."
              searchPlaceholder="Search origin office..."
              required
            />
          )}
        </div>

        <DepartmentSelectField
          value={formData.departmentId}
          departments={departments}
          userDepartmentId={userDepartmentId}
          canCrossDepartment={canCrossDepartment}
          onChange={(departmentId) =>
            onFormDataChange((previous) => ({ ...previous, departmentId }))
          }
        />

        <div>
          <label className="block mb-1.5 font-medium">Project</label>
          <SearchableSelect
            value={formData.projectId}
            options={projectOptions}
            onChange={(projectId) =>
              onFormDataChange((previous) => ({ ...previous, projectId }))
            }
            placeholder="Select project..."
            searchPlaceholder="Search project..."
          />
        </div>
      </div>

      <div>
        <label className="block mb-1.5 font-medium">Subject *</label>
        <Input
          type="text"
          required
          value={formData.subject}
          onChange={(event) =>
            onFormDataChange((previous) => ({
              ...previous,
              subject: event.target.value,
            }))
          }
          placeholder="Monthly Printer Rental"
        />
      </div>

      <div>
        <label className="block mb-1.5 font-medium">Description</label>
        <RichTextEditor
          value={formData.description}
          onChange={(description) =>
            onFormDataChange((previous) => ({ ...previous, description }))
          }
          placeholder="Describe budget plan details..."
          maxContentBytes={DESCRIPTION_MAX_BYTES}
        />
      </div>

      <div>
        <label className="block mb-1.5 font-medium">Supporting Documents</label>

        {existingSupportingDocs.length > 0 && (
          <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-medium text-gray-600">Existing documents</p>
            <ul className="space-y-2 text-sm text-gray-700">
              {existingSupportingDocs.map((url) => (
                <li key={url} className="flex items-center justify-between gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-blue-600 hover:underline"
                  >
                    {url.split('/').pop() || url}
                  </a>
                  {onRemoveExistingSupportingDoc ? (
                    <button
                      type="button"
                      onClick={() => onRemoveExistingSupportingDoc(url)}
                      className="shrink-0 text-xs text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer transition w-fit">
            Upload Documents
            <input
              type="file"
              className="hidden"
              multiple
              onChange={(event) =>
                onAttachmentFilesChange(Array.from(event.target.files || []))
              }
            />
          </label>

          <span className="text-sm text-gray-500 max-w-[300px] truncate">
            {attachmentFiles.length > 0
              ? `${attachmentFiles.length} file selected`
              : 'No file selected'}
          </span>
        </div>

        {attachmentFiles.length > 0 && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <ul className="space-y-1 text-sm text-gray-700">
              {attachmentFiles.map((file) => (
                <li key={`${file.name}-${file.lastModified}`} className="truncate">
                  {file.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-medium mb-3">Monthly Allocation</h3>

        <div className="mb-4">
          <MonthChecklistSelector
            selectedMonths={selectedMonths}
            onChange={onSelectedMonthsChange}
            showSelectAll
          />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm font-medium shrink-0">Base Amount</label>
          <Input
            type="text"
            value={baseAmount}
            onChange={(event) => onBaseAmountChange(event.target.value)}
            placeholder="18.000.000"
            className="max-w-[200px]"
          />
          <button
            type="button"
            onClick={onCopyToAll}
            className="px-3 py-2 text-sm border border-gray-400 rounded-lg hover:bg-gray-50"
          >
            copy to all
          </button>
          <button
            type="button"
            onClick={onSplitEvenly}
            className="px-3 py-2 text-sm border border-gray-400 rounded-lg hover:bg-gray-50"
          >
            split evenly
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-300">
          <Table>
            <thead>
              <TableHeaderRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Allocation</TableHead>
              </TableHeaderRow>
            </thead>
            <tbody>
              {selectedMonthsSorted.length === 0 ? (
                <TableEmptyRow colSpan={3}>Select at least one month</TableEmptyRow>
              ) : (
                selectedMonthsSorted.map((month, index) => (
                  <TableBodyRow key={month}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{MONTH_NAMES[month - 1]}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={allocations[month] ?? 0}
                        onChange={(event) =>
                          onAllocationsChange((previous) => ({
                            ...previous,
                            [month]: parseFloat(event.target.value) || 0,
                          }))
                        }
                        className="max-w-[180px]"
                      />
                    </TableCell>
                  </TableBodyRow>
                ))
              )}
            </tbody>
            {selectedMonthsSorted.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-400 bg-gray-50">
                  <td className="px-4 py-3 font-medium" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatAllocationDisplay(totalAllocation)}
                  </td>
                </tr>
              </tfoot>
            )}
          </Table>
        </div>
      </div>

      <div>
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

      <div className="flex justify-end gap-3 pt-4 border-t">
        <ButtonLink href={cancelHref} variant="outline">
          <X className="w-4 h-4" />
          Cancel
        </ButtonLink>
        <button
          type="submit"
          disabled={isSubmitting || isUploadingAttachments}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {resolvedSubmitLabel}
        </button>
      </div>
    </form>
  );
}
