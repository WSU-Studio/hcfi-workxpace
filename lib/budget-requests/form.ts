import type { ApprovalSchemaOption } from '@/lib/approval-schema';
import { getCurrentFiscalYear } from '@/lib/fiscal-year';
import { isRichTextEmpty } from '@/lib/utils';
import {
  getItemSubtotal,
  getItemTotal,
  type BudgetRequestLineItemInput,
} from '@/components/budget-requests/BudgetRequestItemsEditor';

export const DESCRIPTION_MAX_BYTES = 200 * 1024;

export interface BudgetRequestPlanOption {
  id: string;
  code: string;
  subject: string;
  description?: string | null;
  fiscalYear: number;
  originOffice: string | null;
  departmentId: string;
  projectId?: string | null;
  categoryId?: string | null;
  categoryKeyIndexId?: string | null;
  costCenterId?: string | null;
  coaId?: string | null;
  opexType?: string | null;
  opexAllocationId?: string | null;
  category?: { name: string } | null;
  costCenter?: { name: string } | null;
  categoryKeyIndex?: { name: string } | null;
  opexAllocation?: { name: string } | null;
}

export interface BudgetRequestFormValues {
  budgetPlanId: string;
  fiscalYear: number;
  originOffice: string;
  departmentId: string;
  projectId: string;
  subject: string;
  description: string;
  notes: string;
  approvalSchemaId: string;
  category: string;
  categoryKeyIndex: string;
  costCenter: string;
  coa: string;
  type: string;
  opexAllocation: string;
  opexType: string;
}

export interface BudgetRequestFormOptions {
  plans: BudgetRequestPlanOption[];
  fiscalYears: { year: number }[];
  departments: { id: string; name: string; code: string }[];
  projects: { id: string; name: string; code: string }[];
  originOffices: { code: string; name: string; isActive: boolean }[];
  approvalSchemas: ApprovalSchemaOption[];
}

export type BudgetRequestValidationField =
  | 'budgetPlan'
  | 'department'
  | 'project'
  | 'subject'
  | 'description'
  | 'notes'
  | 'months'
  | 'items'
  | 'approvalSchema';

export interface BudgetRequestValidationError {
  message: string;
  field: BudgetRequestValidationField;
}

export interface BudgetRequestTaxSummary {
  totalAmount: number;
  vatAmount: number;
  whtAmount: number;
  invoiceAmount: number;
  grandTotal: number;
}

export function createDefaultFormValues(): BudgetRequestFormValues {
  return {
    budgetPlanId: '',
    fiscalYear: getCurrentFiscalYear(),
    originOffice: '',
    departmentId: '',
    projectId: '',
    subject: '',
    description: '',
    notes: '',
    approvalSchemaId: '',
    category: '',
    categoryKeyIndex: '',
    costCenter: '',
    coa: '',
    type: '',
    opexAllocation: '',
    opexType: '',
  };
}

export function buildEmptyLineItem(): BudgetRequestLineItemInput {
  return {
    id: crypto.randomUUID(),
    item: '',
    qty: 1,
    unitPrice: 0,
    deduction: 0,
  };
}

export function mapApiLineToEditor(
  lineItem: {
    id: string;
    item: string;
    qty: number;
    unitPrice: unknown;
    deduction?: unknown;
  },
): BudgetRequestLineItemInput {
  return {
    id: lineItem.id,
    item: lineItem.item,
    qty: Number(lineItem.qty),
    unitPrice: Number(lineItem.unitPrice),
    deduction: Number(lineItem.deduction ?? 0),
  };
}

/** Grand Total Period Allocation = grand total (inc. tax) × selected month count. */
export function computeGrandTotalPeriodAllocation(
  grandTotal: number,
  monthCount: number,
): number {
  if (monthCount <= 0 || grandTotal <= 0) return 0;
  return grandTotal * monthCount;
}

export function computeTaxSummary(
  lineItems: BudgetRequestLineItemInput[],
  taxConfig: { vatPercent: number; whtPercent: number },
): BudgetRequestTaxSummary {
  const totalAmount = lineItems.reduce((sum, item) => sum + getItemTotal(item), 0);
  const vatAmount = Math.round(totalAmount * (taxConfig.vatPercent / 100));
  const invoiceAmount = totalAmount + vatAmount;
  const whtAmount = Math.round(totalAmount * (taxConfig.whtPercent / 100));
  const grandTotal = invoiceAmount - whtAmount;

  return {
    totalAmount,
    vatAmount,
    whtAmount,
    invoiceAmount,
    grandTotal,
  };
}

export function buildLineItemsPayload(lineItems: BudgetRequestLineItemInput[]) {
  return lineItems
    .filter((item) => item.item.trim().length > 0)
    .map((item) => ({
      item: item.item,
      qty: item.qty,
      unitPrice: item.unitPrice,
      subtotal: getItemSubtotal(item),
      deduction: item.deduction,
      total: getItemTotal(item),
    }));
}

export function selectedMonthsFromAllocations(
  allocations: { month: number }[] | undefined,
): number[] {
  return Array.from(new Set((allocations || []).map((allocation) => allocation.month))).sort(
    (a, b) => a - b,
  );
}

export function applyPlanToFormValues(
  previous: BudgetRequestFormValues,
  plan: BudgetRequestPlanOption | undefined,
  planId: string,
): BudgetRequestFormValues {
  return {
    ...previous,
    budgetPlanId: planId,
    approvalSchemaId: previous.approvalSchemaId,
    subject: plan ? `${plan.subject} - Request` : previous.subject,
    description: plan ? (plan.description ?? '') : previous.description,
    fiscalYear: plan?.fiscalYear ?? previous.fiscalYear,
    originOffice: plan?.originOffice ?? previous.originOffice,
    departmentId: plan?.departmentId ?? previous.departmentId,
    projectId: plan?.projectId ?? previous.projectId,
    category: plan?.categoryId ?? '',
    categoryKeyIndex: plan?.categoryKeyIndexId ?? '',
    costCenter: plan?.costCenterId ?? '',
    coa: plan?.coaId ?? '',
    type: plan?.opexType ?? '',
    opexAllocation: plan?.opexAllocationId ?? '',
    opexType: plan?.opexType ?? '',
  };
}

/**
 * Required write fields highlighted on Budget Request create/edit:
 * Department, Project, Description, Notes (Supporting Documents stay optional).
 */
export function validateRequiredBudgetRequestWriteFields(
  formData: Pick<BudgetRequestFormValues, 'departmentId' | 'projectId' | 'description' | 'notes'>,
): BudgetRequestValidationError | null {
  if (!formData.departmentId) {
    return { message: 'Department is required', field: 'department' };
  }

  if (!formData.projectId) {
    return { message: 'Project is required', field: 'project' };
  }

  if (isRichTextEmpty(formData.description)) {
    return { message: 'Description is required', field: 'description' };
  }

  const descriptionSize = new TextEncoder().encode(formData.description || '').length;
  if (descriptionSize > DESCRIPTION_MAX_BYTES) {
    return { message: 'Description is too large. Maximum 200KB.', field: 'description' };
  }

  if (!formData.notes.trim()) {
    return { message: 'Notes is required', field: 'notes' };
  }

  return null;
}

export function requiredBudgetRequestWriteFieldsFromBody(body: {
  departmentId?: unknown;
  projectId?: unknown;
  description?: unknown;
  notes?: unknown;
}): Pick<BudgetRequestFormValues, 'departmentId' | 'projectId' | 'description' | 'notes'> {
  return {
    departmentId: typeof body.departmentId === 'string' ? body.departmentId : '',
    projectId: typeof body.projectId === 'string' ? body.projectId : '',
    description: typeof body.description === 'string' ? body.description : '',
    notes: typeof body.notes === 'string' ? body.notes : '',
  };
}

interface ValidateBudgetRequestFormInput {
  formData: BudgetRequestFormValues;
  selectedMonths: number[];
  lineItems: BudgetRequestLineItemInput[];
  totalAmount: number;
  /** Final payable amount (invoice − WHT). Must be > 0. */
  grandTotal?: number;
  schemasForDepartment: { id: string }[];
  requireBudgetPlan?: boolean;
}

export function validateBudgetRequestForm({
  formData,
  selectedMonths,
  lineItems,
  totalAmount,
  grandTotal,
  schemasForDepartment,
  requireBudgetPlan = false,
}: ValidateBudgetRequestFormInput): BudgetRequestValidationError | null {
  if (requireBudgetPlan && !formData.budgetPlanId) {
    return { message: 'Select a budget plan before submitting', field: 'budgetPlan' };
  }

  if (!formData.subject.trim()) {
    return { message: 'Subject is required', field: 'subject' };
  }

  const requiredFieldsError = validateRequiredBudgetRequestWriteFields(formData);
  if (requiredFieldsError) return requiredFieldsError;

  if (!formData.approvalSchemaId) {
    return {
      message:
        schemasForDepartment.length === 0
          ? 'No approval schema is configured for the selected department. Set one up before submitting.'
          : 'Select an approval schema before submitting',
      field: 'approvalSchema',
    };
  }

  if (!schemasForDepartment.some((schema) => schema.id === formData.approvalSchemaId)) {
    return {
      message: 'Selected approval schema does not belong to the selected department',
      field: 'approvalSchema',
    };
  }

  if (selectedMonths.length === 0) {
    return {
      message: 'Select at least one month for request allocation',
      field: 'months',
    };
  }

  const hasItemName = lineItems.some((item) => item.item.trim().length > 0);
  if (!hasItemName || totalAmount <= 0) {
    return {
      message: 'Add item details with a total amount greater than 0',
      field: 'items',
    };
  }

  const finalAmount = grandTotal ?? totalAmount;
  if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
    return {
      message: 'Grand total must be greater than 0',
      field: 'items',
    };
  }

  return null;
}

export async function fetchBudgetPlanDetails(planId: string): Promise<{
  fiscalYear?: number;
  originOffice?: string | null;
  departmentId?: string;
  projectId?: string | null;
  description?: string | null;
} | null> {
  try {
    const response = await fetch(`/api/budget-plans/${planId}`);
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.plan ?? null;
  } catch {
    return null;
  }
}
