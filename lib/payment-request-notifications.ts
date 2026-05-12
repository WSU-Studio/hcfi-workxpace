import { prisma } from '@/lib/prisma';

/** Users to notify (requestor + anyone with an approval-schema role), excluding the actor. */
export async function resolvePaymentRequestNotificationRecipientIds(
  requestId: string,
  actorUserId: string
): Promise<string[]> {
  const request = await prisma.paymentRequest.findUnique({
    where: { id: requestId },
    include: { approvalSchema: { include: { approvalLevels: true } } },
  });
  if (!request) return [];

  const roleIds = Array.from(new Set((request.approvalSchema?.approvalLevels || []).map((level) => level.roleId)));
  if (roleIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { id: request.requestorId || undefined },
        { roleId: { in: roleIds } },
        { userRoles: { some: { roleId: { in: roleIds } } } },
      ],
    },
    select: { id: true },
  });

  return Array.from(new Set(users.map((user) => user.id))).filter((id) => id !== actorUserId);
}

export async function createPaymentRequestApprovalNotifications(params: {
  requestId: string;
  actorUserId: string;
  status: string;
  requestCode: string;
  declineReason?: string | null;
}): Promise<void> {
  const recipientIds = await resolvePaymentRequestNotificationRecipientIds(params.requestId, params.actorUserId);
  if (!recipientIds.length) return;

  const titleByStatus: Record<string, string> = {
    Reviewed: 'Payment Request Reviewed',
    Approved: 'Payment Request Approved',
    Revision: 'Payment Request Needs Revision',
    Declined: 'Payment Request Declined',
  };
  const title = titleByStatus[params.status] || 'Payment Request Updated';
  const messageBase = `${params.requestCode} status changed to ${params.status}.`;
  const message =
    params.declineReason && (params.status === 'Revision' || params.status === 'Declined')
      ? `${messageBase} Reason: ${params.declineReason}`
      : messageBase;

  await prisma.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      title,
      message,
      type: params.status === 'Approved' ? 'success' : params.status === 'Declined' ? 'error' : 'info',
    })),
  });
}

/** When the requestor creates or saves a PR (Draft), notify reviewers who share roles on the approval schema. */
export async function notifyPaymentRequestAwaitingReview(params: {
  requestId: string;
  actorUserId: string;
  requestCode: string;
  event: 'created' | 'updated';
}): Promise<void> {
  const recipientIds = await resolvePaymentRequestNotificationRecipientIds(params.requestId, params.actorUserId);
  if (!recipientIds.length) return;

  const title = params.event === 'created' ? 'Payment Request submitted' : 'Payment Request updated';
  const message =
    params.event === 'created'
      ? `${params.requestCode} was submitted and is waiting for review (Draft).`
      : `${params.requestCode} was updated by the requestor and is waiting for review (Draft).`;

  await prisma.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      title,
      message,
      type: 'info',
    })),
  });
}
