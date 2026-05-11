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
import { createPaymentRequestApprovalNotifications } from '@/lib/payment-request-notifications';

export const dynamic = 'force-dynamic';

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

    await createPaymentRequestApprovalNotifications({
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
