import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const before = await prisma.budgetRequest.findUnique({
      where: { id },
      include: {
        budgetPlan: { select: { code: true, subject: true } },
        department: { select: { name: true } },
        lineItems: { select: { total: true } },
      },
    });
    const updated = await prisma.budgetRequest.update({
      where: { id },
      data: { status: 'Approved' },
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
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
