import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const requests = await prisma.budgetRequest.findMany({
      include: {
        budgetPlan: { select: { code: true, subject: true } },
        department: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const plans = await prisma.budgetPlan.findMany({
      where: { status: 'Approved' },
      select: { id: true, code: true, subject: true, departmentId: true },
    });
    return NextResponse.json({ requests, plans });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { budgetPlanId, subject, description, fiscalYear, departmentId, notes, approvalSchemaId, lineItems } = body;

    if (!budgetPlanId || !subject || !departmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    const count = await prisma.budgetRequest.count({ where: { departmentId, fiscalYear: fiscalYear ?? new Date().getFullYear() } });
    const code = `BR/${dept?.code ?? 'XX'}/${String(count + 1).padStart(3, '0')}`;

    const br = await prisma.budgetRequest.create({
      data: {
        code,
        budgetPlanId,
        subject,
        description: description ?? null,
        fiscalYear: fiscalYear ?? new Date().getFullYear(),
        departmentId,
        requestorId: session.user.id,
        requestDate: new Date(),
        notes: notes ?? null,
        approvalSchemaId: approvalSchemaId || null,
        lineItems: {
          create: (lineItems ?? []).map((li: { item?: string; qty?: number; unitPrice?: number; subtotal?: number; deduction?: number; total?: number }) => ({
            item: li.item ?? '',
            qty: li.qty ?? 0,
            unitPrice: li.unitPrice ?? 0,
            subtotal: li.subtotal ?? 0,
            deduction: li.deduction ?? 0,
            total: li.total ?? 0,
          })),
        },
      },
      include: {
        lineItems: true,
        budgetPlan: { select: { code: true, subject: true } },
        department: { select: { name: true } },
      },
    });

    const totalRequested = br.lineItems.reduce((sum, li) => sum + Number(li.total ?? 0), 0);

    await logActivity({
      userId: session.user.id,
      entityType: 'BudgetRequest',
      entityId: br.id,
      entityCode: br.code,
      action: 'create',
      details: {
        subject: br.subject,
        description: br.description,
        fiscalYear: br.fiscalYear,
        status: br.status,
        budgetPlanCode: br.budgetPlan?.code ?? null,
        budgetPlanSubject: br.budgetPlan?.subject ?? null,
        departmentName: br.department?.name ?? null,
        notes: br.notes,
        approvalSchemaId: br.approvalSchemaId,
        lineItemCount: br.lineItems.length,
        totalRequested,
      },
    });

    return NextResponse.json(br);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
