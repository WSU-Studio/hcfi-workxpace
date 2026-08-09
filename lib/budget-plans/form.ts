import type { ApprovalSchemaOption } from '@/lib/approval-schema';

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const DESCRIPTION_MAX_BYTES = 200 * 1024;

export interface BudgetPlanFormValues {
  fiscalYear: number;
  originOffice: string;
  departmentId: string;
  projectId: string;
  subject: string;
  description: string;
  approvalSchemaId: string;
}

export interface BudgetPlanFormOptions {
  fiscalYears: { year: number }[];
  departments: { id: string; name: string; code: string }[];
  projects: { id: string; name: string; code: string }[];
  originOffices: { code: string; name: string; isActive: boolean }[];
  approvalSchemas: ApprovalSchemaOption[];
}

export interface BudgetPlanAllocationInput {
  month: number;
  allocation: number;
}

export function createEmptyAllocations(): Record<number, number> {
  return Object.fromEntries([...Array(12)].map((_, index) => [index + 1, 0]));
}

export function createDefaultFormValues(): BudgetPlanFormValues {
  return {
    fiscalYear: new Date().getFullYear(),
    originOffice: '',
    departmentId: '',
    projectId: '',
    subject: '',
    description: '',
    approvalSchemaId: '',
  };
}

export function parseBaseAmount(value: string): number {
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function formatAllocationDisplay(amount: number): string {
  return amount.toLocaleString('id-ID');
}

import { uploadSupportingDocs } from '@/lib/supporting-docs';

export {
  normalizeSupportingDocs,
  uploadSupportingDocs,
} from '@/lib/supporting-docs';

/** @deprecated Prefer uploadSupportingDocs(..., 'budget-plans') */
export async function uploadBudgetPlanSupportingDocs(files: File[]): Promise<string[]> {
  return uploadSupportingDocs(files, 'budget-plans');
}

export function allocationsFromPlanRows(
  rows: { month: number; allocation: unknown }[] | undefined,
): { allocations: Record<number, number>; selectedMonths: number[] } {
  const allocations = createEmptyAllocations();
  const withValue: number[] = [];

  (rows || []).forEach((row) => {
    const value = Number(row.allocation ?? 0);
    allocations[row.month] = value;
    if (value > 0) withValue.push(row.month);
  });

  return {
    allocations,
    selectedMonths: withValue.length > 0 ? withValue : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  };
}

export function toAllocationPayload(
  selectedMonths: number[],
  allocations: Record<number, number>,
): BudgetPlanAllocationInput[] {
  return [...selectedMonths]
    .sort((a, b) => a - b)
    .map((month) => ({
      month,
      allocation: allocations[month] ?? 0,
    }));
}

export type BudgetPlanValidationField =
  | 'subject'
  | 'description'
  | 'department'
  | 'approvalSchema'
  | 'months'
  | 'allocations';

export type BudgetPlanValidationError = {
  message: string;
  field: BudgetPlanValidationField;
};

interface ValidateBudgetPlanFormInput {
  formData: BudgetPlanFormValues;
  selectedMonths: number[];
  schemasForDepartment: { id: string }[];
  /** Sum of monthly allocations — must be > 0 to create/save. */
  totalAllocation: number;
  requireDepartmentAndSubject?: boolean;
}

export function validateBudgetPlanForm({
  formData,
  selectedMonths,
  schemasForDepartment,
  totalAllocation,
  requireDepartmentAndSubject = true,
}: ValidateBudgetPlanFormInput): BudgetPlanValidationError | null {
  if (requireDepartmentAndSubject && !formData.departmentId) {
    return { message: 'Department is required', field: 'department' };
  }

  if (requireDepartmentAndSubject && !formData.subject) {
    return { message: 'Subject is required', field: 'subject' };
  }

  if (!formData.approvalSchemaId) {
    return {
      message:
        schemasForDepartment.length === 0
          ? 'No approval schema is configured for the selected department. Set one up before submitting.'
          : 'Select an approval schema before submitting',
      field: 'approvalSchema',
    };
  }

  if (selectedMonths.length === 0) {
    return { message: 'Select at least one month for allocation', field: 'months' };
  }

  if (!Number.isFinite(totalAllocation) || totalAllocation <= 0) {
    return {
      message: 'Total budget allocation must be greater than 0',
      field: 'allocations',
    };
  }

  const descriptionSize = new TextEncoder().encode(formData.description || '').length;
  if (descriptionSize > DESCRIPTION_MAX_BYTES) {
    return { message: 'Description is too large. Maximum 200KB.', field: 'description' };
  }

  return null;
}

