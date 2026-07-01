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

/** Fields required to build the JSON budget-request snapshot. */
export type BudgetRequestSnapshotSource = {
  id: string;
  code: string;
  subject: string;
  fiscalYear: number;
  originOffice: string | null;
  category: string | null;
  categoryKeyIndex: string | null;
  costCenter: string | null;
  coa: string | null;
  type: string | null;
  opexAllocation: string | null;
  opexType: string | null;
  grandTotal: Prisma.Decimal;
  department: { code: string; name: string } | null;
  project: { code: string; name: string } | null;
  budgetPlan: {
    code: string;
    subject: string;
    originOffice: string | null;
    project: { code: string; name: string } | null;
  } | null;
};

/** Budget request row loaded for reconciliation → data mart staging. */
export type BudgetForReconciliation = BudgetRequestSnapshotSource & {
  budgetPlanId: string | null;
  departmentId: string;
  status: string;
  updatedAt: Date;
  lineItems: { qty: number }[];
};

export const budgetForReconciliationInclude = {
  department: true,
  project: { select: { code: true, name: true } },
  budgetPlan: {
    select: {
      code: true,
      subject: true,
      originOffice: true,
      project: { select: { code: true, name: true } },
    },
  },
  lineItems: true,
};

export function buildBudgetRequestSnapshot(
  br: BudgetRequestSnapshotSource,
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
    projectCode: br.project?.code ?? br.budgetPlan?.project?.code ?? null,
    projectName: br.project?.name ?? br.budgetPlan?.project?.name ?? null,
    originOffice: br.originOffice ?? br.budgetPlan?.originOffice ?? null,
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
