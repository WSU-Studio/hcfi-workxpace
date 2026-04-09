import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

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
