import { prisma } from '@/lib/prisma';
import type { ConfinsCashDisbursement, ConfinsPaymentSource } from './types';

export type ConfinsMockFetchOptions = {
  fiscalYear?: number;
  month?: number;
  ebudgetPlanId?: string;
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

function toIncomingReferenceFromPlanCode(planCode: string): string {
  // Simulasikan input di Confins: user kadang hanya mengisi angka tanpa prefix department.
  return planCode.replace(/^[A-Za-z]+/, '');
}

function pickSource(i: number): ConfinsPaymentSource {
  return i % 2 === 0 ? 'Core' : 'E-GL';
}

function pickActiveMonth(
  allocations: Array<{ month: number; allocation: unknown }>,
  preferredMonth?: number
): number {
  if (preferredMonth) return preferredMonth;
  const nonZeroMonths = allocations
    .filter((a) => Number(a.allocation ?? 0) > 0)
    .map((a) => a.month);
  if (nonZeroMonths.length > 0) return nonZeroMonths[0];
  return new Date().getMonth() + 1;
}

async function paymentsFromApprovedPlans(now: Date, options: ConfinsMockFetchOptions): Promise<{
  payments: ConfinsCashDisbursement[];
  approvedRequestCount: number;
}> {
  const plans = await prisma.budgetPlan.findMany({
    where: {
      status: 'Approved',
      ...(options.fiscalYear != null ? { fiscalYear: options.fiscalYear } : {}),
      ...(options.departmentId ? { departmentId: options.departmentId } : {}),
    },
    include: {
      department: { select: { id: true, code: true } },
      allocations: { orderBy: { month: 'asc' } },
      budgetRequests: {
        where: { status: 'Approved' },
        orderBy: { updatedAt: 'desc' },
        include: {
          allocations: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  const out: ConfinsCashDisbursement[] = [];
  let seq = 0;
  let approvedRequestCount = 0;

  for (const plan of plans) {
    const req = plan.budgetRequests[0] ?? null;
    if (req) approvedRequestCount += 1;

    const month = pickActiveMonth(plan.allocations, options.month);
    const fy = options.fiscalYear ?? plan.fiscalYear;
    const postDate = midMonthIso(fy, month);
    const expected = plan.allocations.find((a) => a.month === month);
    const expectedAmount = Number(expected?.allocation ?? 0);
    const requestTotal = req ? Number(req.grandTotal) : 0;
    const baseAmount = requestTotal > 0 ? requestTotal : expectedAmount;
    const paymentAmount = baseAmount > 0 ? baseAmount : 2_500_000;

    seq += 1;
    out.push({
      id: `CFN-PLAN-${plan.id.slice(-8)}-A`,
      incomingReferenceId: toIncomingReferenceFromPlanCode(plan.code),
      voucherNumber: `VCH-${plan.code}-A`,
      postDate,
      fiscalYear: fy,
      month,
      source: pickSource(seq),
      ebudgetPlanId: plan.id,
      ebudgetPlanCode: plan.code,
      ebudgetRequestId: req?.id ?? null,
      ebudgetRequestCode: req?.code ?? null,
      description: req?.subject ?? `${plan.subject} - Disbursement`,
      glAccountCode: (plan.coaId ?? '0000.00').split(' ')[0],
      glAccountName: plan.coaId ? `COA ${plan.coaId}` : 'COA from plan',
      amount: n2(paymentAmount),
      currency: 'IDR',
      departmentId: plan.departmentId,
      departmentCode: plan.department?.code ?? null,
      updatedAt: now.toISOString(),
    });

    // Buat skenario split payment untuk menjelaskan "1 request bisa beberapa pembayaran".
    if (paymentAmount >= 20_000_000) {
      const splitAmount = Math.round(paymentAmount * 0.35 * 100) / 100;
      if (splitAmount > 0) {
        seq += 1;
        out.push({
          id: `CFN-PLAN-${plan.id.slice(-8)}-B`,
          incomingReferenceId: toIncomingReferenceFromPlanCode(plan.code),
          voucherNumber: `VCH-${plan.code}-B`,
          postDate,
          fiscalYear: fy,
          month,
          source: pickSource(seq),
          ebudgetPlanId: plan.id,
          ebudgetPlanCode: plan.code,
          ebudgetRequestId: req?.id ?? null,
          ebudgetRequestCode: req?.code ?? null,
          description: `${req?.subject ?? plan.subject} - Partial Payment`,
          glAccountCode: (plan.coaId ?? '0000.00').split(' ')[0],
          glAccountName: plan.coaId ? `COA ${plan.coaId}` : 'COA from plan',
          amount: n2(splitAmount),
          currency: 'IDR',
          departmentId: plan.departmentId,
          departmentCode: plan.department?.code ?? null,
          updatedAt: now.toISOString(),
        });
      }
    }
  }

  return {
    payments: out,
    approvedRequestCount,
  };
}

/** Skenario statis: salah ID plan, nominal tidak sama (untuk uji unmatched / variance). */
function staticEdgeCasePayments(
  now: Date,
  options: ConfinsMockFetchOptions,
  matchedPlans: ConfinsCashDisbursement[]
): ConfinsCashDisbursement[] {
  const y = options.fiscalYear ?? now.getFullYear();
  const m = options.month ?? now.getMonth() + 1;
  const base = matchedPlans[0];

  return [
    {
      id: 'CFN-EDGE-UNKNOWN-PLAN',
      incomingReferenceId: 'ITT2026003',
      voucherNumber: 'VCH-EDGE-001',
      postDate: midMonthIso(y, m),
      fiscalYear: y,
      month: m,
      source: 'Core',
      ebudgetPlanId: 'clid_typo_or_unknown_budget_plan',
      description: 'Mock: FK plan salah — harus unmatched atau koreksi manual',
      glAccountCode: '5100.01',
      glAccountName: 'Mock GL — OPEX',
      amount: n2(5_000_000),
      currency: 'IDR',
      departmentId: null,
      departmentCode: null,
      ebudgetRequestId: null,
      ebudgetRequestCode: null,
      updatedAt: now.toISOString(),
    },
    {
      id: 'CFN-EDGE-VARIANCE',
      incomingReferenceId: base?.incomingReferenceId ?? '2026003',
      voucherNumber: 'VCH-EDGE-002',
      postDate: midMonthIso(y, m),
      fiscalYear: y,
      month: m,
      source: 'E-GL',
      ebudgetPlanId: base?.ebudgetPlanId ?? 'clid_same_as_valid_but_amount_differs',
      ebudgetPlanCode: base?.ebudgetPlanCode,
      description: 'Mock: plan valid namun amount berbeda untuk uji variance',
      glAccountCode: '5200.02',
      glAccountName: 'Mock GL — Services',
      amount: n2(600_000_000),
      currency: 'IDR',
      departmentId: base?.departmentId ?? null,
      departmentCode: base?.departmentCode ?? null,
      ebudgetRequestId: base?.ebudgetRequestId ?? null,
      ebudgetRequestCode: base?.ebudgetRequestCode ?? null,
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

  const fromDbResult = await paymentsFromApprovedPlans(now, options);
  const fromDb = fromDbResult.payments;
  const edge = includeEdgeCases ? staticEdgeCasePayments(now, options, fromDb) : [];
  const merged = [...fromDb, ...edge];

  let filtered = merged;

  if (options.fiscalYear != null) {
    filtered = filtered.filter((p) => p.fiscalYear === options.fiscalYear);
  }
  if (options.month != null) {
    filtered = filtered.filter((p) => p.month === options.month);
  }
  if (options.ebudgetPlanId) {
    filtered = filtered.filter((p) => p.ebudgetPlanId === options.ebudgetPlanId);
  }
  if (options.departmentId) {
    filtered = filtered.filter((p) => p.departmentId === options.departmentId);
  }

  return {
    payments: filtered,
    usedLocalApprovedRequests: fromDbResult.approvedRequestCount > 0,
  };
}

export async function fetchConfinsMockPaymentById(
  id: string
): Promise<ConfinsCashDisbursement | null> {
  const { payments } = await fetchConfinsMockPayments({ includeEdgeCases: true });
  return payments.find((p) => p.id === id) ?? null;
}
