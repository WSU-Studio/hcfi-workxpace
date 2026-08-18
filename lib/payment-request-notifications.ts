import { prisma } from '@/lib/prisma';
import { sendNotificationEmails } from '@/lib/email';
import { resolveSchemaNotificationUserIds } from '@/lib/approval-level-pics';

/** Users to notify (requestor + anyone with an approval-schema role), excluding the actor. */
export async function resolvePaymentRequestNotificationRecipientIds(
  requestId: string,
  actorUserId: string
): Promise<string[]> {
  const request = await prisma.paymentRequest.findUnique({
    where: { id: requestId },
    include: {
      approvalSchema: {
        include: { approvalLevels: { include: { pics: { select: { userId: true } } } } },
      },
    },
  });
  if (!request) return [];

  return resolveSchemaNotificationUserIds({
    levels: request.approvalSchema?.approvalLevels ?? [],
    requestorId: request.requestorId,
    actorUserId,
  });
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

  await sendNotificationEmails(recipientIds, {
    subject: title,
    text: message,
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

  await sendNotificationEmails(recipientIds, {
    subject: title,
    text: message,
  });
}
