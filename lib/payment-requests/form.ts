import type { ApprovalSchemaOption } from '@/lib/approval-schema';
import {
  getItemSubtotal,
  getItemTotal,
  type BudgetRequestLineItemInput,
} from '@/components/budget-requests/BudgetRequestItemsEditor';
import type { AccountOption, ClassificationOption } from '@/lib/classification-options';
import {
  classificationFromStored,
  classificationToStored,
  type RequestClassificationValue,
  type StoredRequestClassification,
} from '@/lib/request-classification';
import {
  buildEmptyLineItem,
  buildLineItemsPayload,
  computeTaxSummary,
  type BudgetRequestTaxSummary,
} from '@/lib/budget-requests/form';

export const DESCRIPTION_MAX_BYTES = 200 * 1024;

export type { BudgetRequestTaxSummary as PaymentRequestTaxSummary };

export { buildEmptyLineItem, buildLineItemsPayload, computeTaxSummary };

export interface ApprovedBudgetRequestOption {
  id: string;
  code: string;
  subject: string;
  description: string | null;
  departmentId: string;
  grandTotal: number;
  fiscalYear: number;
  vatPercent: number;
  whtPercent: number;
  lineItems: {
    item: string;
    qty: number;
    unitPrice: number;
    deduction: number;
  }[];
  category?: string | null;
  categoryKeyIndex?: string | null;
  costCenter?: string | null;
  coa?: string | null;
  type?: string | null;
  opexAllocation?: string | null;
  opexType?: string | null;
  budgetPlan: { originOffice: string | null; projectId: string | null } | null;
}

export interface PaymentRequestFormValues {
  subject: string;
  description: string;
  notes: string;
  approvalSchemaId: string;
  budgetRequestId: string;
  fiscalYear: number;
  originOffice: string;
  departmentId: string;
  projectId: string;
  currency: string;
  payeeName: string;
  bankAccount: string;
  vendorInvoiceNo: string;
  dateNeeded: string;
  paymentPurpose: string;
}

export interface PaymentRequestFormOptions {
  approvedBudgetRequests: ApprovedBudgetRequestOption[];
  fiscalYears: { year: number }[];
  departments: { id: string; name: string; code: string }[];
  projects: { id: string; name: string; code: string }[];
  originOffices: { code: string; name: string; isActive: boolean }[];
  approvalSchemas: ApprovalSchemaOption[];
  categoryOptions: ClassificationOption[];
  categoryKeyIndexOptions: ClassificationOption[];
  costCenterOptions: ClassificationOption[];
  opexAllocationOptions: ClassificationOption[];
  accountOptions: AccountOption[];
}

export function createDefaultFormValues(): PaymentRequestFormValues {
  return {
    subject: '',
    description: '',
    notes: '',
    approvalSchemaId: '',
    budgetRequestId: '',
    fiscalYear: new Date().getFullYear(),
    originOffice: '',
    departmentId: '',
    projectId: '',
    currency: 'IDR',
    payeeName: '',
    bankAccount: '',
    vendorInvoiceNo: '',
    dateNeeded: '',
    paymentPurpose: '',
  };
}

export function formatDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
  }
  return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
}

export function parseDateInputValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

export function parseDateInputToDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const normalized = parseDateInputValue(value);
  if (!normalized) return null;
  return new Date(`${normalized}T00:00:00.000Z`);
}

export function mapBrLineItemsToEditor(
  rows: ApprovedBudgetRequestOption['lineItems'] | undefined,
): BudgetRequestLineItemInput[] {
  const mapped = (rows ?? [])
    .filter((lineItem) => String(lineItem.item ?? '').trim().length > 0)
    .map((lineItem) => ({
      id: crypto.randomUUID(),
      item: String(lineItem.item).trim(),
      qty: Math.max(0, Math.round(Number(lineItem.qty)) || 0),
      unitPrice: Number.isFinite(Number(lineItem.unitPrice)) ? Number(lineItem.unitPrice) : 0,
      deduction: Math.max(0, Number.isFinite(Number(lineItem.deduction)) ? Number(lineItem.deduction) : 0),
    }));

  return mapped.length > 0 ? mapped : [buildEmptyLineItem()];
}

export function mapPaymentRequestLineToEditor(lineItem: {
  id: string;
  item: string;
  qty: number;
  unitPrice: unknown;
  deduction?: unknown;
}): BudgetRequestLineItemInput {
  return {
    id: lineItem.id,
    item: lineItem.item,
    qty: Number(lineItem.qty),
    unitPrice: Number(lineItem.unitPrice),
    deduction: Number(lineItem.deduction ?? 0),
  };
}

export interface BudgetRequestChangeContext {
  approvedBudgetRequests: ApprovedBudgetRequestOption[];
  fiscalYears: { year: number }[];
  departments: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  originOffices: { code: string; name: string; isActive: boolean }[];
}

export function getDefaultOriginOffice(
  originOffices: { code: string; isActive: boolean }[],
): string {
  if (originOffices.length === 0) return 'HQ';
  return (originOffices.find((office) => office.isActive) ?? originOffices[0])?.code ?? 'HQ';
}

export function clearBudgetRequestSelection(
  previous: PaymentRequestFormValues,
  context: BudgetRequestChangeContext,
): PaymentRequestFormValues {
  return {
    ...previous,
    budgetRequestId: '',
    subject: '',
    description: '',
    notes: '',
    approvalSchemaId: '',
    payeeName: '',
    bankAccount: '',
    vendorInvoiceNo: '',
    dateNeeded: '',
    paymentPurpose: '',
    currency: 'IDR',
    fiscalYear: context.fiscalYears[0]?.year ?? new Date().getFullYear(),
    departmentId: context.departments[0]?.id ?? '',
    projectId: context.projects[0]?.id ?? '',
    originOffice: getDefaultOriginOffice(context.originOffices),
  };
}

export function applyBudgetRequestToFormValues(
  previous: PaymentRequestFormValues,
  budgetRequest: ApprovedBudgetRequestOption,
  budgetRequestId: string,
): PaymentRequestFormValues {
  const title = (budgetRequest.subject || budgetRequest.code).trim();
  return {
    ...previous,
    budgetRequestId,
    subject: title ? `${title} payment-requests` : previous.subject,
    description: budgetRequest.description?.trim() ? budgetRequest.description : '',
    departmentId: budgetRequest.departmentId,
    fiscalYear: budgetRequest.fiscalYear,
    originOffice: budgetRequest.budgetPlan?.originOffice ?? previous.originOffice,
    projectId: budgetRequest.budgetPlan?.projectId ?? '',
  };
}

export function validatePaymentRequestForm(input: {
  formData: PaymentRequestFormValues;
  lineItems: BudgetRequestLineItemInput[];
  totalAmount: number;
  schemasForDepartment: { id: string }[];
  isBudgetRequestSelected: boolean;
}): string | null {
  const { formData, lineItems, totalAmount, schemasForDepartment, isBudgetRequestSelected } = input;

  if (!formData.subject.trim() || !formData.payeeName.trim()) {
    return 'Enter subject and payee.';
  }

  if (!formData.departmentId) {
    return 'Select department.';
  }

  if (!isBudgetRequestSelected && !formData.originOffice?.trim()) {
    return 'Select origin office.';
  }

  if (!formData.approvalSchemaId) {
    return schemasForDepartment.length === 0
      ? 'No approval schema is configured for the selected department. Set one up before submitting.'
      : 'Select an approval schema before submitting.';
  }

  const hasItemName = lineItems.some((item) => item.item.trim().length > 0);
  if (!hasItemName || totalAmount <= 0) {
    return 'Add item details with a total amount greater than 0.';
  }

  const descriptionSize = new TextEncoder().encode(formData.description || '').length;
  if (descriptionSize > DESCRIPTION_MAX_BYTES) {
    return 'Description is too large. Maximum 200KB.';
  }

  return null;
}

export function buildPaymentRequestSubmitPayload(
  formData: PaymentRequestFormValues,
  lineItems: BudgetRequestLineItemInput[],
  taxConfig: { vatPercent: number; whtPercent: number },
  taxSummary: BudgetRequestTaxSummary,
  classification: RequestClassificationValue,
) {
  const stored = classificationToStored(classification);

  return {
    subject: formData.subject.trim(),
    description: formData.description || null,
    notes: formData.notes || null,
    approvalSchemaId: formData.approvalSchemaId || null,
    budgetRequestId: formData.budgetRequestId || null,
    departmentId: formData.departmentId,
    fiscalYear: formData.fiscalYear,
    originOffice: formData.originOffice || null,
    projectId: formData.projectId || null,
    vatPercent: taxConfig.vatPercent,
    vatAmount: taxSummary.vatAmount,
    whtPercent: taxConfig.whtPercent,
    whtAmount: taxSummary.whtAmount,
    invoiceAmount: taxSummary.invoiceAmount,
    grandTotal: taxSummary.grandTotal,
    lineItems: buildLineItemsPayload(lineItems),
    currency: formData.currency,
    payeeName: formData.payeeName.trim(),
    bankAccount: formData.bankAccount.trim() || null,
    vendorInvoiceNo: formData.vendorInvoiceNo.trim() || null,
    dateNeeded: parseDateInputValue(formData.dateNeeded),
    paymentPurpose: formData.paymentPurpose || null,
    costCenterId: stored.costCenter,
    categoryId: stored.category,
    categoryKeyIndexId: stored.categoryKeyIndex,
    coaId: stored.coa,
    opexType: stored.opexType,
    opexAllocationId: stored.opexAllocation,
  };
}

export function classificationFromPaymentRequestRow(
  row: StoredRequestClassification,
): RequestClassificationValue {
  return classificationFromStored(row);
}
