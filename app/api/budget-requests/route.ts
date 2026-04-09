import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

type BudgetRequestLineItemInput = {
  item?: string;
  qty?: number;
  unitPrice?: number;
  subtotal?: number;
  deduction?: number;
  total?: number;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

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
    const {
      budgetPlanId,
      subject,
      description,
      fiscalYear,
      departmentId,
      notes,
      approvalSchemaId,
      lineItems,
      selectedMonths,
    } = body;

    if (!budgetPlanId || !subject || !departmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedMonths = Array.isArray(selectedMonths)
      ? Array.from(new Set(selectedMonths.map((m: unknown) => Number(m)).filter((m: number) => Number.isInteger(m) && m >= 1 && m <= 12))).sort((a, b) => a - b)
      : [];

    if (normalizedMonths.length === 0) {
      return NextResponse.json({ error: 'Select at least one month for request allocation' }, { status: 400 });
    }

    const normalizedLineItems: BudgetRequestLineItemInput[] = Array.isArray(lineItems) ? lineItems : [];
    const totalAmount = normalizedLineItems.reduce((sum, li) => sum + toNumber(li.total), 0);

    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Total request amount must be greater than 0' }, { status: 400 });
    }

    const year = Number(fiscalYear ?? new Date().getFullYear());
    const totalAmountCents = Math.round(totalAmount * 100);
    const monthCount = normalizedMonths.length;
    const baseCents = Math.floor(totalAmountCents / monthCount);
    const remainder = totalAmountCents - baseCents * monthCount;
    const monthlyAllocations = normalizedMonths.map((month, index) => ({
      year,
      month,
      allocation: (baseCents + (index === monthCount - 1 ? remainder : 0)) / 100,
    }));

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
