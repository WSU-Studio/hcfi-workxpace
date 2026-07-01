import { Prisma } from '@prisma/client';
import {
  deriveDataInterfaceSource,
  pickFirstDate,
  pickFirstString,
} from '@/lib/data-mart/confins-json-pickers';
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
  include: {
    department: true;
    budgetPlan: { include: { project: true } };
    lineItems: true;
  };
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
  const snapRaw = row.confinsSnapshot ?? {};
  const snap = snapRaw as Record<string, unknown>;
  const budgetRequestSnapshot = buildBudgetRequestSnapshot(br, requestorName);

  const currencyCode =
    row.currencyCode ?? pickCurrencyFromSnapshot(snap) ?? pickString(snap, 'CurrencyCode');

  const businessRole =
    row.businessRole ?? pickString(snap, 'businessRole') ?? pickString(snap, 'BusinessRole');
  const activityCode = row.activityCode ?? pickString(snap, 'activityCode') ?? pickString(snap, 'ActivityCode');
  const subActivityCode =
    row.subActivityCode ?? pickString(snap, 'subActivityCode') ?? pickString(snap, 'SubActivityCode');
  const activityLabel = row.activityLabel ?? pickString(snap, 'activity') ?? pickString(snap, 'Activity');
  const subActivityLabel =
    row.subActivityLabel ?? pickString(snap, 'subActivity') ?? pickString(snap, 'SubActivity');
  const vendorName = row.vendorName ?? pickString(snap, 'vendorName') ?? pickString(snap, 'VendorName');
  const interfaceId = row.interfaceId ?? pickString(snap, 'interfaceId') ?? pickString(snap, 'InterfaceID');
  const paymentRequestNo =
    row.paymentRequestNo ??
    pickString(snap, 'paymentRequestNo') ??
    pickString(snap, 'PaymentRequestNo');
  const divisionName =
    row.divisionName ??
    pickFirstString(snap, ['DivisionName', 'divisionName']) ??
    pickString(snap, 'Division');

  const journalNo = pickFirstString(snap, ['JournalNo', 'journalNo', 'JournalNumber', 'journalNumber']);
  const voucherEgl = pickFirstString(snap, ['VoucherEgl', 'voucherEgl', 'VoucherEGL', 'VoucherNo']);
  const invoiceNo = pickFirstString(snap, ['InvoiceNo', 'invoiceNo']);
  const invoiceDate = pickFirstDate(snap, ['InvoiceDate', 'invoiceDate']);

  const paymentRequestDate =
    pickFirstDate(snap, [
      'RequestDate',
      'requestDate',
      'PaymentRequestDate',
      'paymentRequestDate',
      'postDate',
    ]) ??
    pickFirstDate(snap, ['postDate', 'PostDate']);

  const requestedByEmail = pickFirstString(snap, [
    'RequestBy',
    'requestBy',
    'RequestedBy',
    'requestedBy',
    'RequestByEmail',
    'requestByEmail',
    'RequestedByEmail',
  ]);

  const originOfficeMerged =
    pickFirstString(snap, ['OriginOffice', 'originOffice']) ??
    br.originOffice ??
    br.budgetPlan?.originOffice ??
    null;
  const departmentNameMerged =
    pickFirstString(snap, ['DepartmentName', 'departmentName']) ?? br.department?.name ?? null;

  const dataInterfaceSource = deriveDataInterfaceSource(saved.paymentSource, snap);

  const planAllocation = br.budgetPlanId
    ? await tx.budgetPlanAllocation.findUnique({
        where: {
          budgetPlanId_month: { budgetPlanId: br.budgetPlanId, month: saved.month },
        },
        select: { allocation: true },
      })
    : null;
  const planAmount = planAllocation?.allocation ?? null;

  const lines = br.lineItems ?? [];
  const sumQty = lines.reduce((a, li) => a + li.qty, 0);
  let costDriverMetric: Prisma.Decimal | null = null;
  let costPerUnit: Prisma.Decimal | null = null;
  if (sumQty > 0) {
    costDriverMetric = new Prisma.Decimal(sumQty);
    const paidN = saved.paidAmount.toNumber();
    costPerUnit = new Prisma.Decimal(paidN / sumQty);
  }

  const budgetRequestApprovedAt = br.status === 'Approved' ? br.updatedAt : null;

  const confinsPayloadRaw = snapRaw as Prisma.InputJsonValue;

  const common = {
    confinsPaymentDocId: saved.confinsPaymentDocId,
    budgetRequestId: saved.budgetRequestId,
    fiscalYear: saved.fiscalYear,
    month: saved.month,
    period,
    quarter,
    budgetRequestCode: br.code,
    budgetPlanCode: br.budgetPlan?.code ?? null,
    budgetRequestSubject: br.subject,
    expenseCategory: br.category,
    categoryKeyIndex: br.categoryKeyIndex,
    costCenter: br.costCenter,
    accountNumberCoa: br.coa,
    opexType: br.opexType,
    opexAllocation: br.opexAllocation,
    budgetRequestType: br.type,
    expenseTypeFp: br.type,
    projectCode: br.project?.code ?? br.budgetPlan?.project?.code ?? null,
    projectName: br.project?.name ?? br.budgetPlan?.project?.name ?? null,
    departmentId: saved.departmentId ?? br.departmentId,
    departmentName: departmentNameMerged,
    originOffice: originOfficeMerged,
    divisionName,
    requestorName,
    incomingReferenceId: saved.incomingReferenceId,
    voucherNumber: saved.voucherNumber,
    paymentDescription: saved.paymentDescription,
    paymentSource: saved.paymentSource,
    dataInterfaceSource,
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
    journalNo,
    voucherEgl,
    invoiceNo,
    invoiceDate,
    paymentRequestDate,
    requestedByEmail,
    budgetRequestApprovedAt,
    planAmount,
    costDriverMetric,
    costPerUnit,
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
