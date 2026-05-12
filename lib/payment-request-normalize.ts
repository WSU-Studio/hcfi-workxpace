import { toNumber, type BudgetRequestLineItemInput } from '@/lib/budget-request-normalize';

export type NormalizedPaymentRequestPayload = {
  normalizedLineItems: BudgetRequestLineItemInput[];
  totalAmount: number;
  normalizedVatPercent: number;
  normalizedWhtPercent: number;
  normalizedVatAmount: number;
  normalizedWhtAmount: number;
  normalizedInvoiceAmount: number;
  normalizedGrandTotal: number;
};

/**
 * Validates line items + tax for payment requests (no monthly allocation).
 */
export function normalizePaymentRequestBody(body: Record<string, unknown>): NormalizedPaymentRequestPayload | { error: string } {
  const lineItems = body.lineItems;
  const vatPercent = body.vatPercent;
  const vatAmount = body.vatAmount;
  const whtPercent = body.whtPercent;
  const whtAmount = body.whtAmount;
  const invoiceAmount = body.invoiceAmount;
  const grandTotal = body.grandTotal;

  const normalizedLineItems: BudgetRequestLineItemInput[] = Array.isArray(lineItems) ? lineItems : [];
  const totalAmount = normalizedLineItems.reduce((sum, li) => sum + toNumber(li.total), 0);

  if (totalAmount <= 0) {
    return { error: 'Total request amount must be greater than 0' };
  }

  const normalizedVatPercent = toNumber(vatPercent) || 11;
  const normalizedWhtPercent = toNumber(whtPercent) || 2;
  const calculatedVatAmount = Math.round(totalAmount * (normalizedVatPercent / 100));
  const calculatedWhtAmount = Math.round(totalAmount * (normalizedWhtPercent / 100));
  const normalizedVatAmount = toNumber(vatAmount) || calculatedVatAmount;
  const normalizedWhtAmount = toNumber(whtAmount) || calculatedWhtAmount;
  const normalizedInvoiceAmount = toNumber(invoiceAmount) || totalAmount + normalizedVatAmount;
  const normalizedGrandTotal = toNumber(grandTotal) || normalizedInvoiceAmount - normalizedWhtAmount;

  return {
    normalizedLineItems,
    totalAmount,
    normalizedVatPercent,
    normalizedWhtPercent,
    normalizedVatAmount,
    normalizedWhtAmount,
    normalizedInvoiceAmount,
    normalizedGrandTotal,
  };
}
