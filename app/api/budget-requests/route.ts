import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { normalizeBudgetRequestBody, toNumber } from '@/lib/budget-request-normalize';
import {
  canUserActOnCurrentBudgetRequestStep,
  getBudgetPlanUserRoleIds,
} from '@/lib/budget-plan-review-eligibility';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRoleIds = session?.user?.id ? await getBudgetPlanUserRoleIds(session.user.id) : [];
    const rows = await prisma.budgetRequest.findMany({
      include: {
        budgetPlan: { select: { code: true, subject: true } },
        department: { select: { name: true } },
        approvalSchema: {
          include: {
            approvalLevels: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const requests = rows.map(({ approvalSchema, ...r }) => ({
      ...r,
      canEdit:
        !!session?.user?.id &&
        r.requestorId === session.user.id &&
        r.status !== 'Approved',
      canReview:
        !!session?.user?.id &&
        canUserActOnCurrentBudgetRequestStep({
          requestStatus: r.status,
          approvalLevels: approvalSchema?.approvalLevels ?? [],
          userRoleIds,
          requestorId: r.requestorId ?? null,
          actorUserId: session.user.id,
        }),
    }));
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
    const { budgetPlanId, subject, description, departmentId, notes, approvalSchemaId } = body;

    if (!budgetPlanId || !subject || !departmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedPayload = normalizeBudgetRequestBody(body, new Date().getFullYear());
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

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    const count = await prisma.budgetRequest.count({ where: { departmentId, fiscalYear: year } });
    const code = `BR/${dept?.code ?? 'XX'}/${String(count + 1).padStart(3, '0')}`;

    const br: any = await prisma.budgetRequest.create({
      data: {
        code,
        budgetPlanId,
        subject,
        description: description ?? null,
        fiscalYear: year,
        departmentId,
        requestorId: session.user.id,
        requestDate: new Date(),
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
        allocations: true,
        budgetPlan: { select: { code: true, subject: true } },
        department: { select: { name: true } },
      },
    } as any);

    const totalRequested = (br.lineItems ?? []).reduce(
      (sum: number, li: { total?: number | string | null }) => sum + toNumber(li.total),
      0
    );

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
        vatPercent: Number(br.vatPercent ?? 0),
        vatAmount: Number(br.vatAmount ?? 0),
        whtPercent: Number(br.whtPercent ?? 0),
        whtAmount: Number(br.whtAmount ?? 0),
        invoiceAmount: Number(br.invoiceAmount ?? 0),
        grandTotal: Number(br.grandTotal ?? 0),
        monthCount: br.allocations.length,
        allocations: (br.allocations ?? []).map((allocation: { year: number; month: number; allocation: number | string }) => ({
          year: allocation.year,
          month: allocation.month,
          allocation: Number(allocation.allocation),
        })),
      },
    });

    return NextResponse.json(br);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
