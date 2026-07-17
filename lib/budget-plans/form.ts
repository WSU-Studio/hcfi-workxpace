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

interface ValidateBudgetPlanFormInput {
  formData: BudgetPlanFormValues;
  selectedMonths: number[];
  schemasForDepartment: { id: string }[];
  requireDepartmentAndSubject?: boolean;
}

export function validateBudgetPlanForm({
  formData,
  selectedMonths,
  schemasForDepartment,
  requireDepartmentAndSubject = true,
}: ValidateBudgetPlanFormInput): string | null {
  if (requireDepartmentAndSubject && (!formData.departmentId || !formData.subject)) {
    return 'Fill required fields';
  }

  if (!formData.approvalSchemaId) {
    return schemasForDepartment.length === 0
      ? 'No approval schema is configured for the selected department. Set one up before submitting.'
      : 'Select an approval schema before submitting';
  }

  if (selectedMonths.length === 0) {
    return 'Select at least one month for allocation';
  }

  const descriptionSize = new TextEncoder().encode(formData.description || '').length;
  if (descriptionSize > DESCRIPTION_MAX_BYTES) {
    return 'Description is too large. Maximum 200KB.';
  }

  return null;
}

