import type { Prisma } from '@prisma/client';
import { buildBudgetRequestSnapshot, computePeriodParts } from '@/lib/data-mart/staging';

export type SaveRowWithStaging = {
  confinsPaymentDocId: string;
  budgetRequestId: string;
  matchType: string;
  incomingReferenceId: string;
  paidAmount: number;
  expectedAmount: number;
  fiscalYear: number;
  month: number;
  departmentId?: string | null;
  voucherNumber?: string | null;
  paymentDescription?: string | null;
  paymentSource?: string | null;
  glAccountCode?: string | null;
  glAccountName?: string | null;
  /** Snapshot Confins/API untuk kolom fallback JSON + turunan opsional. */
  confinsSnapshot?: Record<string, unknown> | null;
  businessRole?: string | null;
  activityCode?: string | null;
  subActivityCode?: string | null;
  activityLabel?: string | null;
  subActivityLabel?: string | null;
  vendorName?: string | null;
  interfaceId?: string | null;
  paymentRequestNo?: string | null;
  currencyCode?: string | null;
  divisionName?: string | null;
};

type Tx = Prisma.TransactionClient;

type BudgetInclude = Prisma.BudgetRequestGetPayload<{
  include: { department: true; budgetPlan: true };
}>;

function pickCurrencyFromSnapshot(snapshot: Record<string, unknown> | null | undefined): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const c = snapshot.currency;
  return typeof c === 'string' ? c : null;
}

function pickString(snapshot: Record<string, unknown> | undefined, key: string): string | null {
  if (!snapshot) return null;
  const v = snapshot[key];
  return typeof v === 'string' ? v : null;
}

export async function upsertDataMartStaging(
  tx: Tx,
  saved: {
    id: string;
    confinsPaymentDocId: string;
    budgetRequestId: string;
    matchType: string;
    incomingReferenceId: string;
    paidAmount: Prisma.Decimal;
    expectedAmount: Prisma.Decimal;
    fiscalYear: number;
    month: number;
    departmentId: string | null;
    voucherNumber: string | null;
    paymentDescription: string | null;
    paymentSource: string | null;
    glAccountCode: string | null;
    glAccountName: string | null;
    savedAt: Date;
  },
  row: SaveRowWithStaging,
  br: BudgetInclude,
  requestorName: string | null
) {
  const { period, quarter } = computePeriodParts(saved.fiscalYear, saved.month);
  const snap = row.confinsSnapshot ?? {};
  const budgetRequestSnapshot = buildBudgetRequestSnapshot(br, requestorName);

  const currencyCode =
    row.currencyCode ?? pickCurrencyFromSnapshot(snap) ?? pickString(snap, 'CurrencyCode');

  const businessRole = row.businessRole ?? pickString(snap, 'businessRole') ?? pickString(snap, 'BusinessRole');
  const activityCode = row.activityCode ?? pickString(snap, 'activityCode') ?? pickString(snap, 'ActivityCode');
  const subActivityCode =
    row.subActivityCode ?? pickString(snap, 'subActivityCode') ?? pickString(snap, 'SubActivityCode');
  const activityLabel = row.activityLabel ?? pickString(snap, 'activity') ?? pickString(snap, 'Activity');
  const subActivityLabel =
    row.subActivityLabel ?? pickString(snap, 'subActivity') ?? pickString(snap, 'SubActivity');
  const vendorName = row.vendorName ?? pickString(snap, 'vendorName') ?? pickString(snap, 'VendorName');
  const interfaceId = row.interfaceId ?? pickString(snap, 'interfaceId') ?? pickString(snap, 'InterfaceID');
  const paymentRequestNo =
    row.paymentRequestNo ?? pickString(snap, 'paymentRequestNo') ?? pickString(snap, 'PaymentRequestNo');
  const divisionName = row.divisionName ?? pickString(snap, 'divisionName') ?? pickString(snap, 'DivisionName');

  const confinsPayloadRaw = snap as Prisma.InputJsonValue;

  const common = {
    confinsPaymentDocId: saved.confinsPaymentDocId,
    budgetRequestId: saved.budgetRequestId,
    fiscalYear: saved.fiscalYear,
    month: saved.month,
    period,
    quarter,
    budgetRequestCode: br.code,
    departmentId: saved.departmentId ?? br.departmentId,
    departmentName: br.department?.name ?? null,
    originOffice: br.budgetPlan?.originOffice ?? null,
    divisionName,
    requestorName,
    incomingReferenceId: saved.incomingReferenceId,
    voucherNumber: saved.voucherNumber,
    paymentDescription: saved.paymentDescription,
    paymentSource: saved.paymentSource,
    glAccountCode: saved.glAccountCode,
    glAccountName: saved.glAccountName,
    paidAmount: saved.paidAmount,
    expectedAmount: saved.expectedAmount,
    currencyCode,
    businessRole,
    activityCode,
    subActivityCode,
    activityLabel,
    subActivityLabel,
    vendorName,
    interfaceId,
    paymentRequestNo,
    confinsPayloadRaw,
    budgetRequestSnapshot,
    matchType: saved.matchType,
    savedAt: saved.savedAt,
  };

  return tx.dataMartStagingRow.upsert({
    where: { reconciliationSavedPaymentId: saved.id },
    create: {
      reconciliationSavedPaymentId: saved.id,
      ...common,
    },
    update: common,
  });
}
