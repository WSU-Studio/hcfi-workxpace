import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import {
  canUserActOnCurrentBudgetPlanStep,
  getBudgetPlanUserRoleIds,
} from '@/lib/budget-plan-review-eligibility';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRoleIds = session?.user?.id ? await getBudgetPlanUserRoleIds(session.user.id) : [];
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const departmentId = searchParams.get('departmentId') ?? '';

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { subject: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const plans = await prisma.budgetPlan.findMany({
      where,
      include: {
        department: { select: { id: true, code: true, name: true } },
        allocations: { orderBy: { month: 'asc' } },
        approvalSchema: { include: { approvalLevels: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const departments = await prisma.department.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });

    const enrichedPlans = plans.map(({ approvalSchema, ...plan }) => ({
      ...plan,
      canEdit: !!session?.user?.id && plan.requestorId === session.user.id,
      canReview: canUserActOnCurrentBudgetPlanStep({
        planStatus: plan.status,
        approvalLevels: approvalSchema?.approvalLevels ?? [],
        userRoleIds,
      }),
    }));

    return NextResponse.json({ plans: enrichedPlans, departments });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const dept = await prisma.department.findUnique({
      where: { id: body.departmentId },
      select: { code: true },
    });
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const departmentCode = (dept?.code ?? 'BP').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const codePrefix = `${departmentCode}${year}${month}`;
    const count = await prisma.budgetPlan.count({
      where: {
        code: {
          startsWith: codePrefix,
        },
      },
    });
    const code = body.code || `${codePrefix}${String(count + 1).padStart(3, '0')}`;

    const plan = await prisma.budgetPlan.create({
      data: {
        code,
        subject: body.subject,
        description: body.description || null,
        fiscalYear: body.fiscalYear,
        originOffice: body.originOffice || null,
        departmentId: body.departmentId,
        projectId: body.projectId || null,
        requestorId: session.user.id,
        requestDate: new Date(),
        status: 'Draft',
        approvalSchemaId: body.approvalSchemaId || null,
        supportingDocs: body.supportingDocs || null,
        coaId: body.coaId || null,
        categoryId: body.categoryId || null,
        categoryKeyIndexId: body.categoryKeyIndexId || null,
        costCenterId: body.costCenterId || null,
        opexId: null,
        opexAllocationId: body.opexType === 'OPEX' ? body.opexAllocationId || null : null,
        opexType: body.opexType || null,
      },
    });

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
          budgetPlanId: plan.id,
          month: m,
          allocation: alloc?.allocation ?? 0,
        },
      });
    }

    await logActivity({
      userId: session.user.id,
      entityType: 'BudgetPlan',
      entityId: plan.id,
      entityCode: plan.code,
      action: 'create',
      details: {
        subject: plan.subject,
        description: plan.description,
        status: plan.status,
        fiscalYear: plan.fiscalYear,
        originOffice: plan.originOffice,
        departmentCode: dept?.code ?? null,
        departmentId: plan.departmentId,
        projectId: plan.projectId,
        approvalSchemaId: plan.approvalSchemaId,
        monthCount: selectedMonths.length,
        selectedMonths,
        totalAllocation,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Failed:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
