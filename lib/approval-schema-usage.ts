import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type ApprovalSchemaDb = Prisma.TransactionClient | typeof prisma;

/**
 * Documents still in the approval lifecycle. Approved / Declined are closed.
 * Matches dashboard outstanding-document status lists.
 */
export const OPEN_APPROVAL_DOCUMENT_STATUSES = [
  'Draft',
  'Pending',
  'Reviewed',
  'Revision',
] as const;

export type ApprovalSchemaDocumentCounts = {
  budgetPlans: number;
  budgetRequests: number;
  paymentRequests: number;
};

export type ApprovalSchemaDocumentUsage = {
  open: ApprovalSchemaDocumentCounts;
  total: ApprovalSchemaDocumentCounts;
};

export function countDocuments(counts: ApprovalSchemaDocumentCounts): number {
  return counts.budgetPlans + counts.budgetRequests + counts.paymentRequests;
}

function formatDocumentCount(
  count: number,
  singular: string,
  plural: string,
): string | null {
  if (count <= 0) return null;
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinCounts(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

export function cannotDeleteSchemaUsedByOpenDocumentsMessage(
  usage: ApprovalSchemaDocumentCounts,
): string {
  const listed = joinCounts(
    [
      formatDocumentCount(usage.budgetPlans, 'Budget Plan', 'Budget Plans'),
      formatDocumentCount(usage.budgetRequests, 'Budget Request', 'Budget Requests'),
      formatDocumentCount(usage.paymentRequests, 'Payment Request', 'Payment Requests'),
    ].filter((part): part is string => part != null),
  );

  return `Cannot delete this approval schema because it is still used by open documents (${listed}). Finish, decline, or reassign those documents first.`;
}

export function cannotDeleteSchemaStillReferencedMessage(): string {
  return 'Cannot delete this approval schema because existing documents still reference it.';
}

/** Null when the schema is safe to delete. */
export function approvalSchemaDeleteBlockReason(
  usage: ApprovalSchemaDocumentUsage,
): string | null {
  if (countDocuments(usage.open) > 0) {
    return cannotDeleteSchemaUsedByOpenDocumentsMessage(usage.open);
  }
  if (countDocuments(usage.total) > 0) {
    return cannotDeleteSchemaStillReferencedMessage();
  }
  return null;
}

export async function loadApprovalSchemaDocumentUsage(
  schemaId: string,
  db: ApprovalSchemaDb = prisma,
): Promise<ApprovalSchemaDocumentUsage> {
  const openWhere = {
    approvalSchemaId: schemaId,
    status: { in: [...OPEN_APPROVAL_DOCUMENT_STATUSES] },
  };
  const anyWhere = { approvalSchemaId: schemaId };

  const [
    openBudgetPlans,
    openBudgetRequests,
    openPaymentRequests,
    totalBudgetPlans,
    totalBudgetRequests,
    totalPaymentRequests,
  ] = await Promise.all([
    db.budgetPlan.count({ where: openWhere }),
    db.budgetRequest.count({ where: openWhere }),
    db.paymentRequest.count({ where: openWhere }),
    db.budgetPlan.count({ where: anyWhere }),
    db.budgetRequest.count({ where: anyWhere }),
    db.paymentRequest.count({ where: anyWhere }),
  ]);

  return {
    open: {
      budgetPlans: openBudgetPlans,
      budgetRequests: openBudgetRequests,
      paymentRequests: openPaymentRequests,
    },
    total: {
      budgetPlans: totalBudgetPlans,
      budgetRequests: totalBudgetRequests,
      paymentRequests: totalPaymentRequests,
    },
  };
}
