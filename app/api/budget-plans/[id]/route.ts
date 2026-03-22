import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const plan = await prisma.budgetPlan.findUnique({
      where: { id },
      include: {
        department: true,
        project: true,
        allocations: { orderBy: { month: 'asc' } },
        approvalSchema: { include: { approvalLevels: { include: { role: true } } } },
      },
    });
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const fiscalYears = await prisma.fiscalYear.findMany({ orderBy: { year: 'desc' } });
    const departments = await prisma.department.findMany({ orderBy: { code: 'asc' } });
    const projects = await prisma.project.findMany({ orderBy: { code: 'asc' } });
    const approvalSchemas = await prisma.approvalSchema.findMany({
      where: { type: 'BudgetPlan' },
      include: { department: true, approvalLevels: { include: { role: true } } },
    });

    return NextResponse.json({ plan, fiscalYears, departments, projects, approvalSchemas });
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
      const before = await prisma.budgetPlan.findUnique({ where: { id }, select: { code: true } });
      await prisma.budgetPlan.update({
        where: { id },
        data: { status: body.status },
      });
      await logActivity({
        userId: session.user.id,
        entityType: 'BudgetPlan',
        entityId: id,
        entityCode: before?.code ?? undefined,
        action: body.status === 'Approved' ? 'approve' : 'update',
        details: { status: body.status },
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
