import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import {
  canUserActOnCurrentBudgetRequestStep,
  getBudgetPlanUserRoleIds,
  getNextBudgetRequestApprovalStep,
} from '@/lib/budget-plan-review-eligibility';

export const dynamic = 'force-dynamic';

async function resolveNotificationUserIds(requestId: string, actorUserId: string) {
  const request = await prisma.paymentRequest.findUnique({
    where: { id: requestId },
    include: { approvalSchema: { include: { approvalLevels: true } } },
  });
  if (!request) return [];

  const roleIds = Array.from(new Set((request.approvalSchema?.approvalLevels || []).map((level) => level.roleId)));
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

async function createApprovalNotifications(params: {
  requestId: string;
  actorUserId: string;
  status: string;
  requestCode: string;
  declineReason?: string | null;
}) {
  const recipientIds = await resolveNotificationUserIds(params.requestId, params.actorUserId);
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const before = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        department: { select: { name: true } },
        budgetRequest: { select: { code: true, subject: true } },
        approvalSchema: {
          include: {
            approvalLevels: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
    });
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (before.status === 'Approved' && body?.action !== 'revision' && body?.action !== 'decline') {
      return NextResponse.json({ error: 'Already approved' }, { status: 400 });
    }

    const levels = before.approvalSchema?.approvalLevels ?? [];
    const userRoleIds = await getBudgetPlanUserRoleIds(session.user.id);
    const action =
      body?.action === 'revision' ? 'revision' : body?.action === 'decline' ? 'decline' : 'approve';
    let newStatus: string;

    if (action === 'revision' || action === 'decline') {
      const allowed = canUserActOnCurrentBudgetRequestStep({
        requestStatus: before.status,
        approvalLevels: levels,
        userRoleIds,
        requestorId: before.requestorId ?? null,
        actorUserId: session.user.id,
      });
      if (!allowed) {
        return NextResponse.json({ error: 'You are not allowed to request revision at this stage' }, { status: 403 });
      }
      if (before.status === 'Approved') {
        return NextResponse.json(
          {
            error:
              action === 'decline'
                ? 'Approved payment request cannot be declined'
                : 'Approved payment request cannot be revised',
          },
          { status: 400 }
        );
      }
      newStatus = action === 'decline' ? 'Declined' : 'Revision';
    } else {
      if (levels.length === 0) {
        if (before.requestorId === session.user.id) {
          return NextResponse.json({ error: 'Requestor cannot approve own request' }, { status: 403 });
        }
        newStatus = 'Approved';
      } else {
        const allowed = canUserActOnCurrentBudgetRequestStep({
          requestStatus: before.status,
          approvalLevels: levels,
          userRoleIds,
          requestorId: before.requestorId ?? null,
          actorUserId: session.user.id,
        });
        if (!allowed) {
          return NextResponse.json({ error: 'You are not allowed to approve at this stage' }, { status: 403 });
        }
        const ordered = [...levels].sort((a, b) => a.stepOrder - b.stepOrder);
        const next = getNextBudgetRequestApprovalStep(before.status, levels);
        if (!next) {
          return NextResponse.json({ error: 'No approval step available' }, { status: 400 });
        }
        const stepIndex = ordered.findIndex((l) => l.stepOrder === next.stepOrder);
        const isLastStep = stepIndex >= 0 && stepIndex === ordered.length - 1;
        newStatus = isLastStep ? 'Approved' : 'Reviewed';
      }
    }

    const updated = await prisma.paymentRequest.update({
      where: { id },
      data: { status: newStatus },
      select: { status: true },
    });

    await logActivity({
      userId: session.user.id,
      entityType: 'PaymentRequest',
      entityId: id,
      entityCode: before.code,
      action: 'approve',
      details: {
        fromStatus: before.status,
        status: updated.status,
        subject: before.subject,
        amount: Number(before.amount),
        departmentName: before.department?.name ?? null,
        budgetRequestCode: before.budgetRequest?.code ?? null,
        declineReason: action === 'revision' || action === 'decline' ? body?.declineReason ?? null : null,
      },
    });

    await createApprovalNotifications({
      requestId: id,
      actorUserId: session.user.id,
      status: updated.status,
      requestCode: before.code,
      declineReason: action === 'revision' || action === 'decline' ? body?.declineReason ?? null : null,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
