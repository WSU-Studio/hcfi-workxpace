import { prisma } from '@/lib/prisma';
import { staticEdgeCasePayments } from './edge-case-payments';
import type { ConfinsCashDisbursement, ConfinsPaymentSource } from './types';

export type ConfinsMockFetchOptions = {
  fiscalYear?: number;
  month?: number;
  ebudgetRequestId?: string;
  departmentId?: string;
  includeEdgeCases?: boolean;
};

/**
 * Mock: tanggal posting unik per baris dalam bulan (deterministik dari id dokumen).
 * Integrasi Confins nyata: set field ini dari tanggal posting/voucher di response API per payment line.
 */
function mockPostingDateIso(year: number, month1to12: number, confinsDocumentKey: string): string {
  const dim = new Date(year, month1to12, 0).getDate();
  let h = 0;
  for (let i = 0; i < confinsDocumentKey.length; i++) {
    h = (h * 33 + confinsDocumentKey.charCodeAt(i)) >>> 0;
  }
  const day = 1 + (h % dim);
  const d = new Date(year, month1to12 - 1, day, 12, 0, 0);
  return d.toISOString();
}

function n2(amount: number): string {
  return amount.toFixed(2);
}

function pickSource(i: number): ConfinsPaymentSource {
  return i % 2 === 0 ? 'Core' : 'E-GL';
}

function pickActiveMonth(
  allocations: Array<{ year: number; month: number; allocation: unknown }>,
  preferredMonth?: number
): number {
  if (preferredMonth) return preferredMonth;
  const nonZeroMonths = allocations
    .filter((a) => Number(a.allocation ?? 0) > 0)
    .map((a) => a.month);
  if (nonZeroMonths.length > 0) return nonZeroMonths[0];
  return new Date().getMonth() + 1;
}

async function paymentsFromApprovedRequests(
  now: Date,
  options: ConfinsMockFetchOptions
): Promise<ConfinsCashDisbursement[]> {
  const requests = await prisma.budgetRequest.findMany({
    where: {
      status: 'Approved',
      ...(options.fiscalYear != null ? { fiscalYear: options.fiscalYear } : {}),
      ...(options.departmentId ? { departmentId: options.departmentId } : {}),
      ...(options.ebudgetRequestId ? { id: options.ebudgetRequestId } : {}),
    },
    include: {
      department: { select: { id: true, code: true } },
      budgetPlan: { select: { id: true, code: true } },
      allocations: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
    },
    orderBy: { updatedAt: 'desc' },
    take: 60,
  });

  const out: ConfinsCashDisbursement[] = [];
  let seq = 0;

  for (const req of requests) {
    const month = pickActiveMonth(req.allocations, options.month);
    const fy = options.fiscalYear ?? req.fiscalYear;
    const idA = `CFN-REQ-${req.id.slice(-8)}-A`;
    const postDate = mockPostingDateIso(fy, month, idA);
    const total = Number(req.grandTotal ?? 0);
    const paymentAmount = total > 0 ? total : 2_500_000;

    seq += 1;
    out.push({
      id: idA,
      incomingReferenceId: req.code,
      voucherNumber: `VCH-${req.code}-A`,
      postDate,
      fiscalYear: fy,
      month,
      source: pickSource(seq),
      ebudgetPlanId: req.budgetPlanId,
      ebudgetPlanCode: req.budgetPlan?.code ?? null,
      ebudgetRequestId: req.id,
      ebudgetRequestCode: req.code,
      description: req.subject,
      glAccountCode: (req.coa ?? '0000.00').split(' ')[0],
      glAccountName: req.coa ? `COA ${req.coa}` : 'COA from request',
      amount: n2(paymentAmount),
      currency: 'IDR',
      departmentId: req.departmentId,
      departmentCode: req.department?.code ?? null,
      updatedAt: now.toISOString(),
    });

    // Simulasi satu request bisa beberapa payment.
    if (paymentAmount >= 20_000_000) {
      const splitAmount = Math.round(paymentAmount * 0.35 * 100) / 100;
      if (splitAmount > 0) {
        seq += 1;
        const idB = `CFN-REQ-${req.id.slice(-8)}-B`;
        out.push({
          id: idB,
          incomingReferenceId: req.code,
          voucherNumber: `VCH-${req.code}-B`,
          postDate: mockPostingDateIso(fy, month, idB),
          fiscalYear: fy,
          month,
          source: pickSource(seq),
          ebudgetPlanId: req.budgetPlanId,
          ebudgetPlanCode: req.budgetPlan?.code ?? null,
          ebudgetRequestId: req.id,
          ebudgetRequestCode: req.code,
          description: `${req.subject} - Partial Payment`,
          glAccountCode: (req.coa ?? '0000.00').split(' ')[0],
          glAccountName: req.coa ? `COA ${req.coa}` : 'COA from request',
          amount: n2(splitAmount),
          currency: 'IDR',
          departmentId: req.departmentId,
          departmentCode: req.department?.code ?? null,
          updatedAt: now.toISOString(),
        });
      }
    }
  }

  return out;
}

export async function fetchConfinsMockPayments(
  options: ConfinsMockFetchOptions = {}
): Promise<{
  payments: ConfinsCashDisbursement[];
  usedLocalApprovedRequests: boolean;
}> {
  const now = new Date();
  const includeEdgeCases = options.includeEdgeCases !== false;

  const fromDb = await paymentsFromApprovedRequests(now, options);
  const edge = includeEdgeCases ? staticEdgeCasePayments(now, options) : [];
  const merged = [...fromDb, ...edge];

  let filtered = merged;

  if (options.fiscalYear != null) {
    filtered = filtered.filter((p) => p.fiscalYear === options.fiscalYear);
  }
  if (options.month != null) {
    filtered = filtered.filter((p) => p.month === options.month);
  }
  if (options.ebudgetRequestId) {
    filtered = filtered.filter((p) => p.ebudgetRequestId === options.ebudgetRequestId);
  }
  if (options.departmentId) {
    filtered = filtered.filter((p) => p.departmentId === options.departmentId);
  }

  return {
    payments: filtered,
    usedLocalApprovedRequests: fromDb.length > 0,
  };
}

export async function fetchConfinsMockPaymentById(
  id: string
): Promise<ConfinsCashDisbursement | null> {
  const { payments } = await fetchConfinsMockPayments({ includeEdgeCases: true });
  return payments.find((p) => p.id === id) ?? null;
}
