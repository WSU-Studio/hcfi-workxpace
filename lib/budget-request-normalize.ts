export type BudgetRequestLineItemInput = {
  item?: string;
  qty?: number;
  unitPrice?: number;
  subtotal?: number;
  deduction?: number;
  total?: number;
};

export const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export type NormalizedBudgetRequestPayload = {
  normalizedMonths: number[];
  normalizedLineItems: BudgetRequestLineItemInput[];
  totalAmount: number;
  year: number;
  normalizedVatPercent: number;
  normalizedWhtPercent: number;
  normalizedVatAmount: number;
  normalizedWhtAmount: number;
  normalizedInvoiceAmount: number;
  /** Per-month item amount (inc. tax) copied onto each selected month. */
  transactionGrandTotal: number;
  /**
   * BR budget impact stored on the document: transaction × selected month count.
   * Example: 10jt items × 4 months → 40jt.
   */
  normalizedGrandTotal: number;
  monthlyAllocations: { year: number; month: number; allocation: number }[];
};

export function normalizeBudgetRequestBody(
  body: Record<string, unknown>,
  defaultYear: number
): NormalizedBudgetRequestPayload | { error: string } {
  const selectedMonths = body.selectedMonths;
  const lineItems = body.lineItems;
  const vatPercent = body.vatPercent;
  const vatAmount = body.vatAmount;
  const whtPercent = body.whtPercent;
  const whtAmount = body.whtAmount;
  const invoiceAmount = body.invoiceAmount;
  const grandTotal = body.grandTotal;
  const fiscalYear = body.fiscalYear;

  const normalizedMonths = Array.isArray(selectedMonths)
    ? Array.from(
        new Set(
          selectedMonths
            .map((m: unknown) => Number(m))
            .filter((m: number) => Number.isInteger(m) && m >= 1 && m <= 12)
        )
      ).sort((a, b) => a - b)
    : [];

  if (normalizedMonths.length === 0) {
    return { error: 'Select at least one month for request allocation' };
  }

  const normalizedLineItems: BudgetRequestLineItemInput[] = Array.isArray(lineItems) ? lineItems : [];
  const totalAmount = normalizedLineItems.reduce((sum, li) => sum + toNumber(li.total), 0);

  if (totalAmount <= 0) {
    return { error: 'Total request amount must be greater than 0' };
  }

  const year = Number(fiscalYear ?? defaultYear);
  const normalizedVatPercent =
    vatPercent === undefined || vatPercent === null || vatPercent === '' ? 0 : toNumber(vatPercent);
  const normalizedWhtPercent =
    whtPercent === undefined || whtPercent === null || whtPercent === '' ? 0 : toNumber(whtPercent);
  const calculatedVatAmount = Math.round(totalAmount * (normalizedVatPercent / 100));
  const calculatedWhtAmount = Math.round(totalAmount * (normalizedWhtPercent / 100));
  const normalizedVatAmount = toNumber(vatAmount) || calculatedVatAmount;
  const normalizedWhtAmount = toNumber(whtAmount) || calculatedWhtAmount;
  const normalizedInvoiceAmount = toNumber(invoiceAmount) || totalAmount + normalizedVatAmount;
  // Body `grandTotal` is the item/transaction total (inc. tax), not the period total.
  const transactionGrandTotal =
    toNumber(grandTotal) || normalizedInvoiceAmount - normalizedWhtAmount;
  const transactionCents = Math.round(transactionGrandTotal * 100);
  const monthCount = normalizedMonths.length;
  const normalizedGrandTotal = (transactionCents * monthCount) / 100;

  const monthlyAllocations = normalizedMonths.map((month) => ({
    year,
    month,
    allocation: transactionCents / 100,
  }));

  return {
    normalizedMonths,
    normalizedLineItems,
    totalAmount,
    year,
    normalizedVatPercent,
    normalizedWhtPercent,
    normalizedVatAmount,
    normalizedWhtAmount,
    normalizedInvoiceAmount,
    transactionGrandTotal,
    normalizedGrandTotal,
    monthlyAllocations,
  };
}
