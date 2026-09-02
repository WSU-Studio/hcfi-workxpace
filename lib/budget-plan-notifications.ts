/**
 * Budget Plan notification helpers.
 *
 * Centralised so the create / edit / status-change flows in
 * `app/api/budget-plans/route.ts` and `app/api/budget-plans/[id]/route.ts`
 * agree on recipients, titles, and message bodies.
 *
 * Recipient rule (mirrors the original implementation):
 *   - Plan requestor (so they see lifecycle changes on their own plan)
 *   - Every active user that holds any role configured in the plan's
 *     approval schema (covers reviewer + approver levels — both legacy
 *     `User.roleId` and `UserRole` join table)
 *   - Excluding the actor that triggered the event
 */
import { prisma } from '@/lib/prisma';
import { sendNotificationEmails } from '@/lib/email';
import { resolveSchemaNotificationUserIds } from '@/lib/approval-level-pics';
import { approvalLevelsOf } from '@/lib/approval-schema-snapshot';

export type BudgetPlanNotificationVariant = 'submit' | 'resubmit';

export interface BudgetPlanNotificationParams {
  planId: string;
  /** User who performed the action; never receives the notification. */
  actorUserId: string;
  /** Resulting plan status (Draft / Reviewed / Approved / Revision / Declined). */
  status: string;
  planCode: string;
  /** Required for Revision/Declined to surface the reviewer's reason. */
  declineReason?: string | null;
  /**
   * Disambiguates Draft state, which can mean either a fresh submission
   * or an edit-after-approval that resets the workflow.
   */
  variant?: BudgetPlanNotificationVariant;
}

/**
 * Resolve the recipient user IDs for a budget-plan event.
 * Exported in case any future flow needs custom messaging while reusing the
 * recipient-resolution rules.
 */
export async function resolveBudgetPlanNotificationUserIds(
  planId: string,
  actorUserId: string,
): Promise<string[]> {
  const plan = await prisma.budgetPlan.findUnique({
    where: { id: planId },
    include: {
      approvalSchema: {
        include: { approvalLevels: { include: { pics: { select: { userId: true } } } } },
      },
    },
  });
  if (!plan) return [];

  return resolveSchemaNotificationUserIds({
    levels: approvalLevelsOf(plan),
    requestorId: plan.requestorId,
    actorUserId,
  });
}

/** Resolve the user-facing notification title for a given status / variant. */
function resolveTitle(params: BudgetPlanNotificationParams): string {
  if (params.status === 'Draft') {
    return params.variant === 'resubmit'
      ? 'Budget Plan updated'
      : 'Budget Plan submitted';
  }
  const titleByStatus: Record<string, string> = {
    Reviewed: 'Budget Plan Reviewed',
    Approved: 'Budget Plan Approved',
    Revision: 'Budget Plan Needs Revision',
    Declined: 'Budget Plan Declined',
  };
  return titleByStatus[params.status] ?? 'Budget Plan Updated';
}

/** Resolve the human-readable message body. */
function resolveMessage(params: BudgetPlanNotificationParams): string {
  if (params.status === 'Draft') {
    return params.variant === 'resubmit'
      ? `${params.planCode} was updated by the requestor and is waiting for review (Draft).`
      : `${params.planCode} was submitted and is waiting for review (Draft).`;
  }
  const base = `${params.planCode} status changed to ${params.status}.`;
  if (
    params.declineReason &&
    (params.status === 'Revision' || params.status === 'Declined')
  ) {
    return `${base} Reason: ${params.declineReason}`;
  }
  return base;
}

/** Map status → notification UI tone. */
function resolveType(status: string): 'success' | 'error' | 'info' {
  if (status === 'Approved') return 'success';
  if (status === 'Declined') return 'error';
  return 'info';
}

/**
 * Fan-out a budget-plan event to every relevant user. Silently no-ops when
 * there are no recipients (e.g. plan with no approval schema configured).
 */
export async function createBudgetPlanNotifications(
  params: BudgetPlanNotificationParams,
): Promise<void> {
  const recipientIds = await resolveBudgetPlanNotificationUserIds(
    params.planId,
    params.actorUserId,
  );
  if (!recipientIds.length) return;

  const title = resolveTitle(params);
  const message = resolveMessage(params);
  const type = resolveType(params.status);

  await prisma.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      title,
      message,
      type,
    })),
  });

  await sendNotificationEmails(recipientIds, {
    subject: title,
    text: message,
  });
}
