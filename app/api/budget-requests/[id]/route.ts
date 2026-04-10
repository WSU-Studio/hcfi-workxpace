import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { normalizeBudgetRequestBody, toNumber } from '@/lib/budget-request-normalize';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const br = await prisma.budgetRequest.findUnique({
      where: { id },
      include: {
        budgetPlan: true,
        department: true,
        lineItems: true,
        allocations: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
        },
        approvalSchema: {
          include: {
            approvalLevels: {
              include: { role: true },
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!br) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const histories = await prisma.activityHistory.findMany({
      where: { entityType: 'BudgetRequest', entityId: id },
      include: { user: { select: { name: true } } },
      orderBy: { timestamp: 'desc' },
    });
    return NextResponse.json({ ...br, histories });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.budgetRequest.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        requestorId: true,
        status: true,
        fiscalYear: true,
        budgetPlanId: true,
      },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.requestorId !== session.user.id) {
      return NextResponse.json({ error: 'Only the requestor can edit this budget request' }, { status: 403 });
    }
    if (existing.status === 'Approved') {
      return NextResponse.json({ error: 'Approved requests cannot be edited' }, { status: 403 });
    }

    const { subject, description, notes, approvalSchemaId, budgetPlanId: bodyPlanId } = body;
    if (!subject || typeof subject !== 'string') {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }

    const nextBudgetPlanId = bodyPlanId || existing.budgetPlanId;
    const plan = await prisma.budgetPlan.findUnique({
      where: { id: nextBudgetPlanId },
      select: { id: true, departmentId: true, status: true },
    });
    if (!plan) return NextResponse.json({ error: 'Budget plan not found' }, { status: 400 });
    if (plan.status !== 'Approved') {
      return NextResponse.json({ error: 'Budget plan must be approved' }, { status: 400 });
    }

    const normalizedPayload = normalizeBudgetRequestBody(body, existing.fiscalYear);
    if ('error' in normalizedPayload) {
      return NextResponse.json({ error: normalizedPayload.error }, { status: 400 });
    }
    const {
      normalizedLineItems,
      totalAmount,
      year,
      normalizedVatPercent,
      normalizedWhtPercent,
      normalizedVatAmount,
      normalizedWhtAmount,
      normalizedInvoiceAmount,
      normalizedGrandTotal,
      monthlyAllocations,
    } = normalizedPayload;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.budgetRequestLineItem.deleteMany({ where: { budgetRequestId: id } });
      await tx.budgetRequestAllocation.deleteMany({ where: { budgetRequestId: id } });
      return tx.budgetRequest.update({
        where: { id },
        data: {
          budgetPlanId: nextBudgetPlanId,
          subject,
          description: description ?? null,
          fiscalYear: year,
          departmentId: plan.departmentId,
          totalAmount,
          vatPercent: normalizedVatPercent,
          vatAmount: normalizedVatAmount,
          whtPercent: normalizedWhtPercent,
          whtAmount: normalizedWhtAmount,
          invoiceAmount: normalizedInvoiceAmount,
          grandTotal: normalizedGrandTotal,
          notes: notes ?? null,
          approvalSchemaId: approvalSchemaId || null,
          lineItems: {
            create: normalizedLineItems.map((li) => ({
              item: li.item ?? '',
              qty: Math.round(toNumber(li.qty)),
              unitPrice: toNumber(li.unitPrice),
              subtotal: toNumber(li.subtotal),
              deduction: toNumber(li.deduction),
              total: toNumber(li.total),
            })),
          },
          allocations: {
            create: monthlyAllocations,
          },
        },
        include: {
          lineItems: true,
          allocations: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
          budgetPlan: true,
          department: true,
          approvalSchema: {
            include: {
              approvalLevels: {
                include: { role: true },
                orderBy: { stepOrder: 'asc' },
              },
            },
          },
        },
      });
    });

    const br: any = updated;

    const totalRequested = (br.lineItems ?? []).reduce(
      (sum: number, li: { total?: number | string | null }) => sum + toNumber(li.total),
      0
    );

    await logActivity({
      userId: session.user.id,
      entityType: 'BudgetRequest',
      entityId: id,
      entityCode: br.code,
      action: 'update',
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
        vatPercent: Number(br.vatPercent ?? 0),
        vatAmount: Number(br.vatAmount ?? 0),
        whtPercent: Number(br.whtPercent ?? 0),
        whtAmount: Number(br.whtAmount ?? 0),
        invoiceAmount: Number(br.invoiceAmount ?? 0),
        grandTotal: Number(br.grandTotal ?? 0),
        monthCount: br.allocations.length,
      },
    });

    const histories = await prisma.activityHistory.findMany({
      where: { entityType: 'BudgetRequest', entityId: id },
      include: { user: { select: { name: true } } },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({ ...br, histories });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
