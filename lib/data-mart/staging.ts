import type { Prisma } from '@prisma/client';

/** Dimensi waktu untuk filter Data Mart (kolom terindeks). */
export function computePeriodParts(fiscalYear: number, month: number): {
  period: string;
  quarter: number;
} {
  const m = Math.min(12, Math.max(1, month));
  const period = `${fiscalYear}-${String(m).padStart(2, '0')}`;
  const quarter = Math.ceil(m / 3);
  return { period, quarter };
}

type BudgetForSnapshot = {
  id: string;
  code: string;
  subject: string;
  fiscalYear: number;
  departmentId: string;
  category: string | null;
  categoryKeyIndex: string | null;
  costCenter: string | null;
  coa: string | null;
  type: string | null;
  opexAllocation: string | null;
  opexType: string | null;
  grandTotal: Prisma.Decimal;
  department: { code: string; name: string } | null;
  budgetPlan: { code: string; subject: string; originOffice: string | null } | null;
};

export function buildBudgetRequestSnapshot(
  br: BudgetForSnapshot,
  requestorName: string | null
): Prisma.InputJsonValue {
  return {
    id: br.id,
    code: br.code,
    subject: br.subject,
    fiscalYear: br.fiscalYear,
    departmentCode: br.department?.code ?? null,
    departmentName: br.department?.name ?? null,
    budgetPlanCode: br.budgetPlan?.code ?? null,
    budgetPlanSubject: br.budgetPlan?.subject ?? null,
    originOffice: br.budgetPlan?.originOffice ?? null,
    category: br.category,
    categoryKeyIndex: br.categoryKeyIndex,
    costCenter: br.costCenter,
    coa: br.coa,
    type: br.type,
    opexAllocation: br.opexAllocation,
    opexType: br.opexType,
    grandTotal: br.grandTotal.toString(),
    requestorName,
  };
}
