import type { ConfinsCashDisbursement, ConfinsPaymentSource } from '@/lib/integrations/confins-mock/types';

export const CONFINS_BUDGET_REAL_PATH =
  process.env.CONFINS_BUDGET_REAL_PATH ||
  '/v1/IntegrationEBudgetingX/GetListGetListBudgetRealBySourceTypeX';

/** Baris `ReturnObject` dari GetListGetListBudgetRealBySourceTypeX (API CONFINS E-Budgeting 1.03). */
export type ConfinsBudgetRealApiRow = Record<string, unknown> & {
  DataInterfaceSource?: string;
  InterfaceID?: string;
  Period?: string;
  Month?: string | number;
  Quarter?: string;
  Year?: string | number;
  OriginOffice?: string;
  DepartmentName?: string;
  GLAccount?: string;
  GLAccountName?: string;
  OpexAllocation?: string;
  PaymentRequestNo?: string;
  JournalNo?: string;
  VoucherEGL?: string;
  RequestDate?: string;
  RequestBy?: string;
  InvoiceDate?: string;
  InvoiceNo?: string;
  BusinessRole?: string;
  Activity?: string;
  SubActivity?: string;
  VendorName?: string;
  Description?: string;
  DC?: string;
  OriginAmount?: string;
  EbudgetRequestCode?: string;
  FormCode?: string;
  /** Field dari mock internal (bukan API live). */
  PostDate?: string;
  Amount?: number;
  Currency?: string;
  Source?: string;
};

const MONTH_ABBR: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export function parseConfinsPeriod(period?: string): { fiscalYear: number; month: number } | null {
  if (!period || typeof period !== 'string') return null;
  const m = period.trim().match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return null;
  const fiscalYear = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(fiscalYear) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { fiscalYear, month };
}

export function parseConfinsMonthLabel(month?: string | number): number | null {
  if (typeof month === 'number' && month >= 1 && month <= 12) return month;
  if (typeof month !== 'string') return null;
  const trimmed = month.trim();
  const asNum = Number(trimmed);
  if (Number.isFinite(asNum) && asNum >= 1 && asNum <= 12) return asNum;
  return MONTH_ABBR[trimmed.slice(0, 3).toLowerCase()] ?? null;
}

/** Contoh: `8.000.000,00` → 8000000 */
export function parseConfinsOriginAmount(raw?: string | number): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw == null || raw === '') return 0;
  const s = String(raw).trim();
  const normalized = s.includes(',')
    ? s.replace(/\./g, '').replace(',', '.')
    : s.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function invoiceDateParts(date: Date): { fiscalYear: number; month: number } {
  return { fiscalYear: date.getFullYear(), month: date.getMonth() + 1 };
}

export function getInvoiceDateRaw(payment: ConfinsCashDisbursement): string | undefined {
  if (payment.invoiceDate?.trim()) return payment.invoiceDate.trim();
  const raw = payment.rawPayload?.InvoiceDate ?? payment.rawPayload?.invoiceDate;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return undefined;
}

/** Filter rekonsiliasi: bulan/tahun dari InvoiceDate API (bukan Period / toMonth request). */
export function paymentMatchesInvoiceMonth(
  payment: ConfinsCashDisbursement,
  fiscalYear: number,
  month: number
): boolean {
  const raw = getInvoiceDateRaw(payment);
  if (raw) {
    const d = parseConfinsShortDate(raw);
    if (d && !Number.isNaN(d.getTime())) {
      return d.getFullYear() === fiscalYear && d.getMonth() + 1 === month;
    }
  }
  return payment.fiscalYear === fiscalYear && payment.month === month;
}

/** Contoh: `18-Jun-25`, `2025-05-20`, `20/05/2025` */
export function parseConfinsShortDate(raw?: string): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  const text = raw.trim();
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const mon = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (mon >= 1 && mon <= 12) {
      const d = new Date(year, mon - 1, day, 12, 0, 0);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const m = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/i);
  if (!m) {
    const d = new Date(text);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const day = Number(m[1]);
  const mon = MONTH_ABBR[m[2].toLowerCase()];
  if (!mon) return null;
  let year = Number(m[3]);
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  const d = new Date(year, mon - 1, day, 12, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Satu kolom `ReturnObject` untuk kode Budget Request (Incoming ID / auto-match).
 * Setelah kesepakatan dengan Confins, ubah env `CONFINS_INCOMING_REF_FIELD` (default: FormCode).
 *
 * Jangan pakai InterfaceID — itu ID batch integrasi (sama untuk banyak baris), bukan kode BR.
 */
export function getConfinsIncomingRefFieldName(): string {
  return process.env.CONFINS_INCOMING_REF_FIELD?.trim() || 'FormCode';
}

export function extractBudgetRequestRef(row: ConfinsBudgetRealApiRow): string {
  const field = getConfinsIncomingRefFieldName();
  const raw = row[field];
  if (typeof raw === 'string') return raw.trim();
  if (raw != null && typeof raw !== 'object') return String(raw).trim();
  return '';
}

function resolveSource(row: ConfinsBudgetRealApiRow): ConfinsPaymentSource {
  const iface = String(row.DataInterfaceSource ?? row.Source ?? '').toUpperCase();
  if (iface.includes('EGL')) return 'E-GL';
  if (iface.includes('CORE') || iface.includes('CONFINS')) return 'Core';
  return 'Core';
}

function stableRowId(row: ConfinsBudgetRealApiRow, index: number): string {
  const iface = String(row.InterfaceID ?? 'IF');
  const pr = String(row.PaymentRequestNo ?? 'PR');
  const gl = String(row.GLAccount ?? 'GL');
  const dc = String(row.DC ?? '');
  const activity = String(row.Activity ?? '');
  return `${iface}-${pr}-${gl}-${dc}-${activity}-${index}`.replace(/\s+/g, '_');
}

export function mapBudgetRealRowsToPayments(rows: ConfinsBudgetRealApiRow[]): ConfinsCashDisbursement[] {
  const now = new Date().toISOString();
  return rows.map((row, index) => {
    const fromPeriod = parseConfinsPeriod(row.Period);
    const monthFromLabel = parseConfinsMonthLabel(row.Month);
    const yearFromField = Number(row.Year);

    const invoiceDateParsed =
      parseConfinsShortDate(row.InvoiceDate) ??
      parseConfinsShortDate(row.RequestDate) ??
      (row.PostDate ? parseConfinsShortDate(row.PostDate) ?? new Date(row.PostDate) : null);

    const periodFallbackYear =
      fromPeriod?.fiscalYear ?? (Number.isFinite(yearFromField) ? yearFromField : new Date().getFullYear());
    const periodFallbackMonth =
      fromPeriod?.month ??
      monthFromLabel ??
      (typeof row.Month === 'number' ? row.Month : new Date().getMonth() + 1);

    const postDateParsed =
      invoiceDateParsed ?? new Date(periodFallbackYear, periodFallbackMonth - 1, 15, 12, 0, 0);

    const { fiscalYear, month } = invoiceDateParsed
      ? invoiceDateParts(invoiceDateParsed)
      : { fiscalYear: periodFallbackYear, month: periodFallbackMonth };

    const amountNum =
      row.Amount != null && Number.isFinite(Number(row.Amount))
        ? Number(row.Amount)
        : parseConfinsOriginAmount(row.OriginAmount);

    const incomingReferenceId = extractBudgetRequestRef(row);

    return {
      id: stableRowId(row, index),
      incomingReferenceId,
      voucherNumber: String(row.JournalNo ?? row.VoucherEGL ?? row.PaymentRequestNo ?? ''),
      postDate: postDateParsed.toISOString(),
      fiscalYear,
      month,
      source: resolveSource(row),
      ebudgetPlanId: null,
      ebudgetPlanCode: null,
      ebudgetRequestId: null,
      ebudgetRequestCode: incomingReferenceId || null,
      description: String(row.Description ?? ''),
      glAccountCode: String(row.GLAccount ?? ''),
      glAccountName: String(row.GLAccountName ?? ''),
      amount: amountNum.toFixed(2),
      currency: String(row.Currency ?? 'IDR'),
      departmentId: null,
      departmentCode: String(row.DepartmentName ?? row.OpexAllocation ?? ''),
      interfaceId: row.InterfaceID != null ? String(row.InterfaceID) : null,
      paymentRequestNo: row.PaymentRequestNo != null ? String(row.PaymentRequestNo) : null,
      journalNo: row.JournalNo != null ? String(row.JournalNo) : null,
      requestDate: row.RequestDate != null ? String(row.RequestDate) : null,
      requestBy: row.RequestBy != null ? String(row.RequestBy) : null,
      invoiceDate: row.InvoiceDate != null ? String(row.InvoiceDate) : null,
      invoiceNo: row.InvoiceNo != null ? String(row.InvoiceNo) : null,
      businessRole: row.BusinessRole != null ? String(row.BusinessRole) : null,
      activity: row.Activity != null ? String(row.Activity) : null,
      subActivity: row.SubActivity != null ? String(row.SubActivity) : null,
      vendorName: row.VendorName != null ? String(row.VendorName) : null,
      rawPayload: row as Record<string, unknown>,
      updatedAt: now,
    };
  });
}

export function departmentNameMatchesPayment(
  payment: ConfinsCashDisbursement,
  departmentName: string
): boolean {
  const target = departmentName.trim().toUpperCase();
  const code = (payment.departmentCode ?? '').trim().toUpperCase();
  const opex = String(payment.rawPayload?.OpexAllocation ?? '')
    .trim()
    .toUpperCase();
  return code === target || opex === target;
}
