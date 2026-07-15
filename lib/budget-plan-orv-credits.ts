import { prisma } from '@/lib/prisma';
import { isOtherReceiveByMarkers } from '@/lib/integrations/confins/v103-budget-real';
import type { OrvCreditInput } from '@/lib/budget-plan-realization';

/**
 * Load saved Other Receive credits for Budget Requests linked to a Budget Plan.
 * Source of truth is Data Mart staging (committed reconciliation matches),
 * not live Confins — unmatched / unused ORV does not change BP outstanding.
 *
 * Detects ORV via DataInterfaceSource / payment source / journal / PR markers,
 * and also via already-signed (negative) paidAmount from the new mapping path.
 */
export async function loadOrvCreditsForBudgetPlan(
  budgetPlanId: string,
  fiscalYear: number,
): Promise<OrvCreditInput[]> {
  const rows = await prisma.dataMartStagingRow.findMany({
    where: {
      fiscalYear,
      budgetRequest: { budgetPlanId },
    },
    select: {
      month: true,
      fiscalYear: true,
      paidAmount: true,
      dataInterfaceSource: true,
      paymentSource: true,
      journalNo: true,
      paymentRequestNo: true,
    },
  });

  return rows
    .filter((row) => {
      const paid = Number(row.paidAmount);
      if (Number.isFinite(paid) && paid < 0) return true;
      return isOtherReceiveByMarkers({
        dataInterfaceSource: row.dataInterfaceSource,
        paymentSource: row.paymentSource,
        journalNo: row.journalNo,
        paymentRequestNo: row.paymentRequestNo,
      });
    })
    .map((row) => ({
      month: row.month,
      fiscalYear: row.fiscalYear,
      amount: row.paidAmount,
    }));
}
