/**
 * Budget Request notification helpers.
 *
 * Mirrors `lib/budget-plan-notifications.ts` so the create / edit / approve
 * flows in `app/api/budget-requests/route.ts`,
 * `app/api/budget-requests/[id]/route.ts`, and
 * `app/api/budget-requests/[id]/approve/route.ts` agree on recipients,
 * titles, and message bodies.
 *
 * Recipient rule (mirrors the original implementation in approve/route.ts):
 *   - Request requestor (so they see lifecycle changes on their own request)
 *   - Every active user that holds any role configured in the request's
 *     approval schema (covers reviewer + approver levels — both legacy
 *     `User.roleId` and `UserRole` join table)
 *   - Excluding the actor that triggered the event
 */
import { prisma } from '@/lib/prisma';
import { sendNotificationEmails } from '@/lib/email';
import { resolveSchemaNotificationUserIds } from '@/lib/approval-level-pics';
import { approvalLevelsOf } from '@/lib/approval-schema-snapshot';

export type BudgetRequestNotificationVariant = 'submit' | 'resubmit';

export interface BudgetRequestNotificationParams {
  requestId: string;
  /** User who performed the action; never receives the notification. */
  actorUserId: string;
  /** Resulting request status (Draft / Reviewed / Approved / Revision / Declined). */
  status: string;
  requestCode: string;
  /** Optional message about qty/price adjustments performed during review. */
  adjustmentNote?: string | null;
  /** Required for Revision/Declined to surface the reviewer's reason. */
  declineReason?: string | null;
  /**
   * Disambiguates Draft state, which can mean either a fresh submission
   * or an edit-after-approval that resets the workflow.
   */
  variant?: BudgetRequestNotificationVariant;
}

/**
 * Resolve the recipient user IDs for a budget-request event.
 * Exported in case any future flow needs custom messaging while reusing
 * the recipient-resolution rules.
 */
export async function resolveBudgetRequestNotificationUserIds(
  requestId: string,
  actorUserId: string,
): Promise<string[]> {
  const request = await prisma.budgetRequest.findUnique({
    where: { id: requestId },
    include: {
      approvalSchema: {
        include: { approvalLevels: { include: { pics: { select: { userId: true } } } } },
      },
    },
  });
  if (!request) return [];

  return resolveSchemaNotificationUserIds({
    levels: approvalLevelsOf(request),
    requestorId: request.requestorId,
    actorUserId,
  });
}

/** Resolve the user-facing notification title for a given status / variant. */
function resolveTitle(params: BudgetRequestNotificationParams): string {
  if (params.status === 'Draft') {
    return params.variant === 'resubmit'
      ? 'Budget Request updated'
      : 'Budget Request submitted';
  }
  const titleByStatus: Record<string, string> = {
    Reviewed: 'Budget Request Reviewed',
    Approved: 'Budget Request Approved',
    Revision: 'Budget Request Needs Revision',
    Declined: 'Budget Request Declined',
  };
  return titleByStatus[params.status] ?? 'Budget Request Updated';
}

/** Resolve the human-readable message body. */
function resolveMessage(params: BudgetRequestNotificationParams): string {
  if (params.status === 'Draft') {
    return params.variant === 'resubmit'
      ? `${params.requestCode} was updated by the requestor and is waiting for review (Draft).`
      : `${params.requestCode} was submitted and is waiting for review (Draft).`;
  }
  const base = `${params.requestCode} status changed to ${params.status}.`;
  const withAdjustment = params.adjustmentNote
    ? `${base} ${params.adjustmentNote}`
    : base;
  if (
    params.declineReason &&
    (params.status === 'Revision' || params.status === 'Declined')
  ) {
    return `${withAdjustment} Reason: ${params.declineReason}`;
  }
  return withAdjustment;
}

/** Map status → notification UI tone. */
function resolveType(status: string): 'success' | 'error' | 'info' {
  if (status === 'Approved') return 'success';
  if (status === 'Declined') return 'error';
  return 'info';
}

/**
 * Fan-out a budget-request event to every relevant user. Silently no-ops when
 * there are no recipients (e.g. request with no approval schema configured).
 */
export async function createBudgetRequestNotifications(
  params: BudgetRequestNotificationParams,
): Promise<void> {
  const recipientIds = await resolveBudgetRequestNotificationUserIds(
    params.requestId,
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
