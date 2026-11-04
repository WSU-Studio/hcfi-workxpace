import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import {
  canUserActOnCurrentStep,
  getBudgetPlanUserRoleIds,
  getNextApprovalStep,
  resolveOnBehalfOfDelegator,
} from '@/lib/budget-plan-review-eligibility';
import type { BudgetPlanHistoryEntry } from '@/lib/budget-plan-approval-display';
import { createPaymentRequestApprovalNotifications } from '@/lib/payment-request-notifications';
import { canEditClassificationFields } from '@/lib/access/classification';
import { approvalLevelsOf } from '@/lib/approval-schema-snapshot';
import { loadActorDelegationContext } from '@/lib/approval-delegation';

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
            approvalLevels: {
              include: { pics: { select: { userId: true } } },
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (before.status === 'Approved' && body?.action !== 'revision' && body?.action !== 'decline') {
      return NextResponse.json({ error: 'Already approved' }, { status: 400 });
    }

    const levels = approvalLevelsOf(before);
    const userRoleIds = await getBudgetPlanUserRoleIds(session.user.id);
    const delegationCtx = await loadActorDelegationContext(session.user.id);
    // Used by the multi-step eligibility checks below — see BR approve route
    // for the rationale.
    const histories = (await prisma.activityHistory.findMany({
      where: { entityType: 'PaymentRequest', entityId: id },
      select: { action: true, details: true, timestamp: true },
    })) as unknown as BudgetPlanHistoryEntry[];
    const action =
      body?.action === 'revision' ? 'revision' : body?.action === 'decline' ? 'decline' : 'approve';
    let newStatus: string;
    let onBehalfOf: { userId: string; name: string } | null = null;
    const nextStep = levels.length
      ? getNextApprovalStep(before.status, levels, histories)
      : null;

    if (action === 'revision' || action === 'decline') {
      const allowed = canUserActOnCurrentStep({
        status: before.status,
        approvalLevels: levels,
        histories,
        userRoleIds,
        requestorId: before.requestorId ?? null,
        actorUserId: session.user.id,
        delegationCtx,
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
      if (nextStep) {
        onBehalfOf = resolveOnBehalfOfDelegator({
          level: nextStep,
          actorUserId: session.user.id,
          userRoleIds,
          ctx: delegationCtx,
        });
      }
    } else {
      if (levels.length === 0) {
        if (before.requestorId === session.user.id) {
          return NextResponse.json({ error: 'Requestor cannot approve own request' }, { status: 403 });
        }
        newStatus = 'Approved';
      } else {
        const allowed = canUserActOnCurrentStep({
          status: before.status,
          approvalLevels: levels,
          histories,
          userRoleIds,
          requestorId: before.requestorId ?? null,
          actorUserId: session.user.id,
          delegationCtx,
        });
        if (!allowed) {
          return NextResponse.json({ error: 'You are not allowed to approve at this stage' }, { status: 403 });
        }
        const ordered = [...levels].sort((a, b) => a.stepOrder - b.stepOrder);
        const next = nextStep;
        if (!next) {
          return NextResponse.json({ error: 'No approval step available' }, { status: 400 });
        }
        const isLastStep = next.stepOrder === ordered[ordered.length - 1]!.stepOrder;
        newStatus = isLastStep ? 'Approved' : 'Reviewed';
        onBehalfOf = resolveOnBehalfOfDelegator({
          level: next,
          actorUserId: session.user.id,
          userRoleIds,
          ctx: delegationCtx,
        });
      }
    }

    // Defense in depth: when the caller lacks `editClassificationSection`,
    // drop the classification fields from the body and keep the persisted
    // values (matches the read-only UI). PR uses denormalized text columns
    // (`category`, `costCenter`, `coa`, `opexAllocation`, `categoryKeyIndex`),
    // so the projection is inline rather than via the shared helper that
    // expects the `*Id` shape used by BP.
    const allowClassificationEdit = canEditClassificationFields(session);
    const nextOpexType = allowClassificationEdit
      ? body?.opexType ?? before.opexType ?? null
      : before.opexType ?? null;

    const updated = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: newStatus,
        categoryKeyIndex: allowClassificationEdit
          ? body?.categoryKeyIndexId ?? before.categoryKeyIndex ?? null
          : before.categoryKeyIndex ?? null,
        costCenter: allowClassificationEdit
          ? body?.costCenterId ?? before.costCenter ?? null
          : before.costCenter ?? null,
        category: allowClassificationEdit
          ? body?.categoryId ?? before.category ?? null
          : before.category ?? null,
        coa: allowClassificationEdit
          ? body?.coaId ?? before.coa ?? null
          : before.coa ?? null,
        type: allowClassificationEdit
          ? body?.opexType ?? before.type ?? null
          : before.type ?? null,
        opexAllocation: allowClassificationEdit
          ? (nextOpexType === 'OPEX' ? body?.opexAllocationId ?? before.opexAllocation ?? null : null)
          : before.opexAllocation ?? null,
        opexType: nextOpexType,
      },
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
        approvalNote:
          action === 'approve'
            ? (typeof body?.approvalNote === 'string' ? body.approvalNote.trim() || null : null)
            : null,
        ...(onBehalfOf
          ? { onBehalfOfUserId: onBehalfOf.userId, onBehalfOfName: onBehalfOf.name }
          : {}),
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
