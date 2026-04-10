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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const before = await prisma.budgetRequest.findUnique({
      where: { id },
      include: {
        budgetPlan: { select: { code: true, subject: true } },
        department: { select: { name: true } },
        lineItems: { select: { total: true } },
        approvalSchema: {
          include: {
            approvalLevels: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
    });
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (before.status === 'Approved') {
      return NextResponse.json({ error: 'Already approved' }, { status: 400 });
    }

    const levels = before.approvalSchema?.approvalLevels ?? [];
    const userRoleIds = await getBudgetPlanUserRoleIds(session.user.id);
    let newStatus: string;

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
      newStatus = isLastStep ? 'Approved' : 'Pending';
    }

    const updated = await prisma.budgetRequest.update({
      where: { id },
      data: {
        status: newStatus,
        categoryKeyIndex: body?.categoryKeyIndexId ?? before.categoryKeyIndex ?? null,
        costCenter: body?.costCenterId ?? before.costCenter ?? null,
        category: body?.categoryId ?? before.category ?? null,
        coa: body?.coaId ?? before.coa ?? null,
        type: body?.opexType ?? before.type ?? null,
        opexAllocation: body?.opexAllocationId ?? before.opexAllocation ?? null,
        opexType: body?.opexType ?? before.opexType ?? null,
      },
      select: { status: true },
    });
    const totalRequested = (before?.lineItems || []).reduce((sum, li) => sum + Number(li.total ?? 0), 0);
    await logActivity({
      userId: session.user.id,
      entityType: 'BudgetRequest',
      entityId: id,
      entityCode: before?.code ?? undefined,
      action: 'approve',
      details: {
        fromStatus: before?.status ?? null,
        status: updated.status,
        subject: before?.subject ?? null,
        fiscalYear: before?.fiscalYear ?? null,
        budgetPlanCode: before?.budgetPlan?.code ?? null,
        budgetPlanSubject: before?.budgetPlan?.subject ?? null,
        departmentName: before?.department?.name ?? null,
        lineItemCount: before?.lineItems.length ?? 0,
        totalRequested,
        categoryKeyIndex: body?.categoryKeyIndexId ?? before?.categoryKeyIndex ?? null,
        costCenter: body?.costCenterId ?? before?.costCenter ?? null,
        category: body?.categoryId ?? before?.category ?? null,
        coa: body?.coaId ?? before?.coa ?? null,
        type: body?.opexType ?? before?.type ?? null,
        opexAllocation: body?.opexAllocationId ?? before?.opexAllocation ?? null,
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
