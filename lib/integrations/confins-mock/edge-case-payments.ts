import type { ConfinsCashDisbursement } from './types';
import type { ConfinsMockFetchOptions } from './build-mock-payments';

function mockPostingDateIso(year: number, month1to12: number, confinsDocumentKey: string): string {
  const dim = new Date(year, month1to12, 0).getDate();
  let h = 0;
  for (let i = 0; i < confinsDocumentKey.length; i++) {
    h = (h * 33 + confinsDocumentKey.charCodeAt(i)) >>> 0;
  }
  const day = 1 + (h % dim);
  return new Date(year, month1to12 - 1, day, 12, 0, 0).toISOString();
}

function n2(amount: number): string {
  return amount.toFixed(2);
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function confinsInvoiceDateLabel(year: number, month1to12: number, day: number): string {
  return `${day}-${MONTH_LABELS[month1to12 - 1]}-${String(year).slice(-2)}`;
}

/** Edge case QA: typo ref + variance nominal (hanya saat tidak ada data Confins). */
export function staticEdgeCasePayments(
  now: Date,
  options: Pick<ConfinsMockFetchOptions, 'fiscalYear' | 'month'>
): ConfinsCashDisbursement[] {
  const y = options.fiscalYear ?? now.getFullYear();
  const m = options.month ?? now.getMonth() + 1;

  const edgePostA = mockPostingDateIso(y, m, 'CFN-EDGE-UNKNOWN-REQUEST');
  const edgePostB = mockPostingDateIso(y, m, 'CFN-EDGE-VARIANCE');
  const edgeDayA = new Date(edgePostA).getDate();
  const edgeDayB = new Date(edgePostB).getDate();

  return [
    {
      id: 'CFN-EDGE-UNKNOWN-REQUEST',
      incomingReferenceId: 'BR/IT/00X',
      voucherNumber: 'VCH-EDGE-001',
      postDate: edgePostA,
      invoiceDate: confinsInvoiceDateLabel(y, m, edgeDayA),
      fiscalYear: y,
      month: m,
      source: 'Core',
      ebudgetPlanId: null,
      ebudgetPlanCode: null,
      ebudgetRequestId: null,
      ebudgetRequestCode: null,
      description: 'Mock: referensi budget request typo, harus unmatched lalu manual match',
      glAccountCode: '5100.01',
      glAccountName: 'Mock GL - OPEX',
      amount: n2(5_000_000),
      currency: 'IDR',
      departmentId: null,
      departmentCode: null,
      updatedAt: now.toISOString(),
    },
    {
      id: 'CFN-EDGE-VARIANCE',
      incomingReferenceId: 'BR/IT/001',
      voucherNumber: 'VCH-EDGE-002',
      postDate: edgePostB,
      invoiceDate: confinsInvoiceDateLabel(y, m, edgeDayB),
      fiscalYear: y,
      month: m,
      source: 'E-GL',
      ebudgetPlanId: null,
      ebudgetPlanCode: null,
      ebudgetRequestId: null,
      ebudgetRequestCode: null,
      description: 'Mock: request valid tapi amount berbeda untuk uji variance',
      glAccountCode: '5200.02',
      glAccountName: 'Mock GL - Services',
      amount: n2(600_000_000),
      currency: 'IDR',
      departmentId: null,
      departmentCode: null,
      updatedAt: now.toISOString(),
    },
  ];
}
