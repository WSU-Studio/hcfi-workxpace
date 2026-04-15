import { prisma } from '@/lib/prisma';
import type { ConfinsCashDisbursement, ConfinsPaymentSource } from './types';

export type ConfinsMockFetchOptions = {
  fiscalYear?: number;
  month?: number;
  ebudgetRequestId?: string;
  departmentId?: string;
  includeEdgeCases?: boolean;
};

function midMonthIso(year: number, month1to12: number): string {
  const d = new Date(year, month1to12 - 1, 15, 12, 0, 0);
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
    const postDate = midMonthIso(fy, month);
    const total = Number(req.grandTotal ?? 0);
    const paymentAmount = total > 0 ? total : 2_500_000;

    seq += 1;
    out.push({
      id: `CFN-REQ-${req.id.slice(-8)}-A`,
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
        out.push({
          id: `CFN-REQ-${req.id.slice(-8)}-B`,
          incomingReferenceId: req.code,
          voucherNumber: `VCH-${req.code}-B`,
          postDate,
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

/** Edge case: typo ref request + variance nominal untuk demo manual matching. */
function staticEdgeCasePayments(
  now: Date,
  options: ConfinsMockFetchOptions,
  matchedRequests: ConfinsCashDisbursement[]
): ConfinsCashDisbursement[] {
  const y = options.fiscalYear ?? now.getFullYear();
  const m = options.month ?? now.getMonth() + 1;
  const base = matchedRequests[0];

  return [
    {
      id: 'CFN-EDGE-UNKNOWN-REQUEST',
      incomingReferenceId: 'BR/IT/00X',
      voucherNumber: 'VCH-EDGE-001',
      postDate: midMonthIso(y, m),
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
      incomingReferenceId: base?.incomingReferenceId ?? 'BR/IT/001',
      voucherNumber: 'VCH-EDGE-002',
      postDate: midMonthIso(y, m),
      fiscalYear: y,
      month: m,
      source: 'E-GL',
      ebudgetPlanId: base?.ebudgetPlanId ?? null,
      ebudgetPlanCode: base?.ebudgetPlanCode ?? null,
      ebudgetRequestId: base?.ebudgetRequestId ?? null,
      ebudgetRequestCode: base?.ebudgetRequestCode ?? null,
      description: 'Mock: request valid tapi amount berbeda untuk uji variance',
      glAccountCode: '5200.02',
      glAccountName: 'Mock GL - Services',
      amount: n2(600_000_000),
      currency: 'IDR',
      departmentId: base?.departmentId ?? null,
      departmentCode: base?.departmentCode ?? null,
      updatedAt: now.toISOString(),
    },
  ];
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
  const edge = includeEdgeCases ? staticEdgeCasePayments(now, options, fromDb) : [];
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
