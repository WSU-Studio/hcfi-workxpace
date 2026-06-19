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
  approvalSchemas: { id: string; name: string; departmentId: string }[];
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

export function normalizeSupportingDocs(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string') {
        return item.url;
      }
      return null;
    })
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
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

export async function uploadBudgetPlanSupportingDocs(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];

  const uploadFormData = new FormData();
  files.forEach((file) => uploadFormData.append('files', file));

  const uploadRes = await fetch('/api/budget-plans/upload-supporting-docs', {
    method: 'POST',
    body: uploadFormData,
  });

  const uploadBody = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(uploadBody.error ?? 'Failed to upload supporting documents');
  }

  return (uploadBody.files ?? []).map((item: { url: string }) => item.url);
}
