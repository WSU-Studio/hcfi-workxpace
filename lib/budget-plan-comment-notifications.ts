import { prisma } from '@/lib/prisma';
import { resolveBudgetPlanNotificationUserIds } from '@/lib/budget-plan-notifications';

export interface BudgetPlanCommentNotificationParams {
  planId: string;
  planCode: string;
  actorUserId: string;
  actorName: string;
  body: string;
  mentionedUserIds?: string[];
}

function truncatePreview(body: string, maxLength = 120): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

/**
 * Notify approval-schema stakeholders, the requestor, @mentioned users, and
 * prior commenters when a new BP comment is posted. The actor is always excluded.
 */
export async function createBudgetPlanCommentNotifications(
  params: BudgetPlanCommentNotificationParams,
): Promise<void> {
  const stakeholderIds = await resolveBudgetPlanNotificationUserIds(
    params.planId,
    params.actorUserId,
  );

  const mentionedIds = Array.from(
    new Set((params.mentionedUserIds ?? []).filter((id) => id && id !== params.actorUserId)),
  );

  const priorCommenterRows = await prisma.budgetPlanComment.findMany({
    where: {
      budgetPlanId: params.planId,
      userId: { not: params.actorUserId },
    },
    select: { userId: true },
    distinct: ['userId'],
  });
  const priorCommenterIds = priorCommenterRows.map((row) => row.userId);

  const recipientIds = Array.from(
    new Set([...stakeholderIds, ...mentionedIds, ...priorCommenterIds]),
  ).filter((id) => id !== params.actorUserId);

  if (!recipientIds.length) return;

  const preview = truncatePreview(params.body);
  const title = 'New comment on Budget Plan';
  const message = `${params.planCode} — ${params.actorName} commented: ${preview}`;

  await prisma.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      title,
      message,
      type: 'info',
    })),
  });
}
