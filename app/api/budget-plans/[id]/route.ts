import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import accountOptions from '@/data/accounts.json';

export const dynamic = 'force-dynamic';

async function getUserRoleIds(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roleId: true,
      userRoles: { select: { roleId: true } },
    },
  });
  if (!user) return [];
  return Array.from(new Set([user.roleId, ...user.userRoles.map((ur) => ur.roleId)]));
}

function getNextApprovalStep(
  status: string,
  levels: { stepOrder: number; roleId: string; levelType: string }[]
) {
  const ordered = [...levels].sort((a, b) => a.stepOrder - b.stepOrder);
  if (!ordered.length) return null;
  if (status === 'Draft') return ordered[0];
  if (status === 'Reviewed' && ordered.length > 1) return ordered[1];
  return null;
}

function isValidReviewTransition(currentStatus: string, nextStatus: string) {
  if (currentStatus === 'Draft') {
    return ['Reviewed', 'Revision', 'Declined'].includes(nextStatus);
  }
  if (currentStatus === 'Reviewed') {
    return ['Approved', 'Revision', 'Declined'].includes(nextStatus);
  }
  return false;
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
        costCenter: true,
        opex: true,
        opexAllocation: true,
      },
    });
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const fiscalYears = await prisma.fiscalYear.findMany({ orderBy: { year: 'desc' } });
    const departments = await prisma.department.findMany({ orderBy: { code: 'asc' } });
    const projects = await prisma.project.findMany({ orderBy: { code: 'asc' } });
    const [approvalSchemas, categoryOptions, costCenterOptions, opexOptions, opexAllocationOptions, histories] = await Promise.all([
      prisma.approvalSchema.findMany({
        where: { type: 'BudgetPlan' },
        include: { department: true, approvalLevels: { include: { role: true } } },
      }),
      prisma.categoryMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
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
      const userRoleIds = await getUserRoleIds(session.user.id);
      const next = getNextApprovalStep(plan.status, plan.approvalSchema.approvalLevels);
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
        costCenterId: body.costCenterId || null,
        opexId: null,
        opexAllocationId: body.opexType === 'OPEX' ? body.opexAllocationId || null : null,
        opexType: body.opexType || null,
      },
    });

    await prisma.budgetPlanAllocation.deleteMany({ where: { budgetPlanId: id } });
    const allocations = body.allocations || [];
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
      const before = await prisma.budgetPlan.findUnique({
        where: { id },
        include: { approvalSchema: { include: { approvalLevels: true } } },
      });
      if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      if (['Reviewed', 'Approved', 'Revision', 'Declined'].includes(body.status)) {
        const levels = before.approvalSchema?.approvalLevels ?? [];
        const next = getNextApprovalStep(before.status, levels);
        if (!isValidReviewTransition(before.status, body.status)) {
          return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
        }
        if (!next) {
          return NextResponse.json({ error: 'No available review step' }, { status: 400 });
        }
        const userRoleIds = await getUserRoleIds(session.user.id);
        if (!userRoleIds.includes(next.roleId)) {
          return NextResponse.json({ error: 'You are not allowed to review at this stage' }, { status: 403 });
        }
      }

      await prisma.budgetPlan.update({
        where: { id },
        data: {
          status: body.status,
          coaId: body.coaId ?? undefined,
          categoryId: body.categoryId ?? undefined,
          costCenterId: body.costCenterId ?? undefined,
          opexId: null,
          opexAllocationId: body.opexType === 'OPEX' ? body.opexAllocationId ?? undefined : null,
          opexType: body.opexType ?? undefined,
        },
      });
      await logActivity({
        userId: session.user.id,
        entityType: 'BudgetPlan',
        entityId: id,
        entityCode: before.code,
        action: body.status === 'Approved' ? 'approve' : body.status === 'Reviewed' ? 'review' : 'update',
        details: {
          status: body.status,
          declineReason: body.declineReason ?? null,
        },
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
