import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import accountOptions from '@/data/accounts.json';
import { getBudgetPlanUserRoleIds, getNextBudgetPlanApprovalStep } from '@/lib/budget-plan-review-eligibility';

export const dynamic = 'force-dynamic';

function isValidReviewTransition(currentStatus: string, nextStatus: string) {
  if (currentStatus === 'Draft') {
    return ['Reviewed', 'Revision', 'Declined'].includes(nextStatus);
  }
  if (currentStatus === 'Reviewed') {
    return ['Approved', 'Revision', 'Declined'].includes(nextStatus);
  }
  return false;
}

async function resolveNotificationUserIds(planId: string, actorUserId: string) {
  const plan = await prisma.budgetPlan.findUnique({
    where: { id: planId },
    include: { approvalSchema: { include: { approvalLevels: true } } },
  });
  if (!plan) return [];

  const roleIds = Array.from(new Set((plan.approvalSchema?.approvalLevels || []).map((l) => l.roleId)));

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { id: plan.requestorId || undefined },
        { roleId: { in: roleIds } },
        { userRoles: { some: { roleId: { in: roleIds } } } },
      ],
    },
    select: { id: true },
  });

  return Array.from(new Set(users.map((u) => u.id))).filter((id) => id !== actorUserId);
}

async function createApprovalNotifications(params: {
  planId: string;
  actorUserId: string;
  status: string;
  planCode: string;
  declineReason?: string | null;
}) {
  const recipientIds = await resolveNotificationUserIds(params.planId, params.actorUserId);
  if (!recipientIds.length) return;

  const titleByStatus: Record<string, string> = {
    Reviewed: 'Budget Plan Reviewed',
    Approved: 'Budget Plan Approved',
    Revision: 'Budget Plan Needs Revision',
    Declined: 'Budget Plan Declined',
  };
  const title = titleByStatus[params.status] || 'Budget Plan Updated';
  const messageBase = `${params.planCode} status changed to ${params.status}.`;
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const plan = await prisma.budgetPlan.findUnique({
      where: { id },
      include: {
        department: true,
        project: true,
        allocations: { orderBy: { month: 'asc' } },
        approvalSchema: { include: { approvalLevels: { include: { role: true }, orderBy: { stepOrder: 'asc' } } } },
        category: true,
        categoryKeyIndex: true,
        costCenter: true,
        opex: true,
        opexAllocation: true,
      },
    });
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const fiscalYears = await prisma.fiscalYear.findMany({ orderBy: { year: 'desc' } });
    const departments = await prisma.department.findMany({ orderBy: { code: 'asc' } });
    const projects = await prisma.project.findMany({ orderBy: { code: 'asc' } });
    const [approvalSchemas, categoryOptions, categoryKeyIndexOptions, costCenterOptions, opexOptions, opexAllocationOptions, histories] = await Promise.all([
      prisma.approvalSchema.findMany({
        where: { type: 'BudgetPlan' },
        include: { department: true, approvalLevels: { include: { role: true } } },
      }),
      prisma.categoryMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.categoryKeyIndexMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.costCenterMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.opexMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.opexAllocationMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.activityHistory.findMany({
        where: { entityType: 'BudgetPlan', entityId: id },
        include: { user: { select: { name: true } } },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    let canReview = false;
    let nextStepOrder: number | null = null;
    if (session?.user?.id && plan.approvalSchema?.approvalLevels?.length) {
      const userRoleIds = await getBudgetPlanUserRoleIds(session.user.id);
      const next = getNextBudgetPlanApprovalStep(plan.status, plan.approvalSchema.approvalLevels);
      nextStepOrder = next?.stepOrder ?? null;
      canReview = !!next && userRoleIds.includes(next.roleId);
    }

    return NextResponse.json({
      plan,
      fiscalYears,
      departments,
      projects,
      approvalSchemas,
      accountOptions,
      categoryOptions,
      categoryKeyIndexOptions,
      costCenterOptions,
      opexOptions,
      opexAllocationOptions,
      histories,
      reviewMeta: { canReview, nextStepOrder },
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.budgetPlan.findUnique({
      where: { id },
      select: { id: true, code: true, requestorId: true, status: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.requestorId !== session.user.id) {
      return NextResponse.json({ error: 'Only requestor can edit this budget plan' }, { status: 403 });
    }

    await prisma.budgetPlan.update({
      where: { id },
      data: {
        subject: body.subject,
        description: body.description ?? null,
        fiscalYear: body.fiscalYear,
        originOffice: body.originOffice ?? null,
        departmentId: body.departmentId,
        projectId: body.projectId || null,
        approvalSchemaId: body.approvalSchemaId || null,
        supportingDocs: body.supportingDocs || null,
        coaId: body.coaId || null,
        categoryId: body.categoryId || null,
        categoryKeyIndexId: body.categoryKeyIndexId || null,
        costCenterId: body.costCenterId || null,
        opexId: null,
        opexAllocationId: body.opexType === 'OPEX' ? body.opexAllocationId || null : null,
        opexType: body.opexType || null,
        status: 'Draft',
      },
    });

    await prisma.budgetPlanAllocation.deleteMany({ where: { budgetPlanId: id } });
    const allocations = body.allocations || [];
    const selectedMonths = allocations
      .filter((a: { month: number; allocation: number }) => Number(a?.allocation ?? 0) > 0)
      .map((a: { month: number }) => a.month)
      .sort((a: number, b: number) => a - b);
    const totalAllocation = allocations.reduce(
      (sum: number, a: { allocation: number }) => sum + Number(a?.allocation ?? 0),
      0
    );
    for (let m = 1; m <= 12; m++) {
      const alloc = allocations.find((a: { month: number }) => a.month === m);
      await prisma.budgetPlanAllocation.create({
        data: {
          budgetPlanId: id,
          month: m,
          allocation: alloc?.allocation ?? 0,
        },
      });
    }

    await logActivity({
      userId: session.user.id,
      entityType: 'BudgetPlan',
      entityId: id,
      entityCode: existing.code,
      action: 'update',
      details: {
        status: 'Draft',
        previousStatus: existing.status,
        note: 'Plan updated by requestor. Approval restarted from step 1.',
        subject: body.subject ?? null,
        fiscalYear: body.fiscalYear ?? null,
        originOffice: body.originOffice ?? null,
        departmentId: body.departmentId ?? null,
        projectId: body.projectId ?? null,
        approvalSchemaId: body.approvalSchemaId ?? null,
        monthCount: selectedMonths.length,
        selectedMonths,
        totalAllocation,
      },
    });

    if (existing.status !== 'Draft') {
      await createApprovalNotifications({
        planId: id,
        actorUserId: session.user.id,
        status: 'Draft',
        planCode: existing.code,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    if (body.status) {
      const trackedFields = [
        'status',
        'coaId',
        'categoryId',
        'categoryKeyIndexId',
        'costCenterId',
        'opexType',
        'opexAllocationId',
      ] as const;
      const before = await prisma.budgetPlan.findUnique({
        where: { id },
        include: { approvalSchema: { include: { approvalLevels: true } } },
      });
      if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      if (['Reviewed', 'Approved', 'Revision', 'Declined'].includes(body.status)) {
        const levels = before.approvalSchema?.approvalLevels ?? [];
        const next = getNextBudgetPlanApprovalStep(before.status, levels);
        if (!isValidReviewTransition(before.status, body.status)) {
          return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
        }
        if (!next) {
          return NextResponse.json({ error: 'No available review step' }, { status: 400 });
        }
        const userRoleIds = await getBudgetPlanUserRoleIds(session.user.id);
        if (!userRoleIds.includes(next.roleId)) {
          return NextResponse.json({ error: 'You are not allowed to review at this stage' }, { status: 403 });
        }
      }

      const updated = await prisma.budgetPlan.update({
        where: { id },
        data: {
          status: body.status,
          coaId: body.coaId ?? undefined,
          categoryId: body.categoryId ?? undefined,
          categoryKeyIndexId: body.categoryKeyIndexId ?? undefined,
          costCenterId: body.costCenterId ?? undefined,
          opexId: null,
          opexAllocationId: body.opexType === 'OPEX' ? body.opexAllocationId ?? undefined : null,
          opexType: body.opexType ?? undefined,
        },
        select: {
          status: true,
          coaId: true,
          categoryId: true,
          categoryKeyIndexId: true,
          costCenterId: true,
          opexType: true,
          opexAllocationId: true,
        },
      });

      const beforeState: Record<string, unknown> = {
        status: before.status,
        coaId: before.coaId,
        categoryId: before.categoryId,
        categoryKeyIndexId: before.categoryKeyIndexId,
        costCenterId: before.costCenterId,
        opexType: before.opexType,
        opexAllocationId: before.opexAllocationId,
      };

      const afterState: Record<string, unknown> = {
        status: updated.status,
        coaId: updated.coaId,
        categoryId: updated.categoryId,
        categoryKeyIndexId: updated.categoryKeyIndexId,
        costCenterId: updated.costCenterId,
        opexType: updated.opexType,
        opexAllocationId: updated.opexAllocationId,
      };

      const previousState: Record<string, unknown> = {};
      const currentState: Record<string, unknown> = {};
      trackedFields.forEach((field) => {
        const prevValue = beforeState[field] ?? null;
        const currValue = afterState[field] ?? null;
        if (prevValue !== currValue) {
          previousState[field] = prevValue;
          currentState[field] = currValue;
        }
      });

      if (body.declineReason !== undefined) {
        previousState.declineReason = null;
        currentState.declineReason = body.declineReason ?? null;
      }

      await logActivity({
        userId: session.user.id,
        entityType: 'BudgetPlan',
        entityId: id,
        entityCode: before.code,
        action: body.status === 'Approved' ? 'approve' : body.status === 'Reviewed' ? 'review' : 'update',
        details: {
          previousState,
          currentState,
        },
      });

      await createApprovalNotifications({
        planId: id,
        actorUserId: session.user.id,
        status: body.status,
        planCode: before.code,
        declineReason: body.declineReason ?? null,
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
