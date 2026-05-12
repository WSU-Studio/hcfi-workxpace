import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import type { MenuAccess } from '@/types/access-control';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const menuAccess = session.user.access?.menuAccess as MenuAccess | undefined;
    if (!menuAccess?.reports) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fy = searchParams.get('fiscalYear');
    const mo = searchParams.get('month');
    const departmentId = searchParams.get('departmentId') ?? '';

    const where: Record<string, unknown> = {};
    if (fy != null && fy !== '') {
      const n = parseInt(fy, 10);
      if (!Number.isNaN(n)) where.fiscalYear = n;
    }
    if (mo != null && mo !== '') {
      const n = parseInt(mo, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 12) where.month = n;
    }
    if (departmentId) where.departmentId = departmentId;

    const rows = await prisma.reconciliationSavedPayment.findMany({
      where,
      orderBy: { savedAt: 'desc' },
      take: 500,
      include: {
        budgetRequest: {
          select: {
            code: true,
            subject: true,
            budgetPlan: { select: { code: true } },
          },
        },
        department: { select: { code: true, name: true } },
        savedBy: { select: { name: true, email: true } },
      },
    });

    const serialized = rows.map((r) => ({
      id: r.id,
      confinsPaymentDocId: r.confinsPaymentDocId,
      budgetRequestCode: r.budgetRequest.code,
      budgetRequestSubject: r.budgetRequest.subject,
      budgetPlanCode: r.budgetRequest.budgetPlan?.code ?? null,
      matchType: r.matchType,
      incomingReferenceId: r.incomingReferenceId,
      paidAmount: r.paidAmount.toString(),
      expectedAmount: r.expectedAmount.toString(),
      variance: (Number(r.paidAmount) - Number(r.expectedAmount)).toFixed(2),
      fiscalYear: r.fiscalYear,
      month: r.month,
      departmentCode: r.department?.code ?? null,
      departmentName: r.department?.name ?? null,
      voucherNumber: r.voucherNumber,
      paymentDescription: r.paymentDescription,
      paymentSource: r.paymentSource,
      glAccountCode: r.glAccountCode,
      glAccountName: r.glAccountName,
      savedByName: r.savedBy.name,
      savedAt: r.savedAt.toISOString(),
    }));

    return NextResponse.json({ rows: serialized });
  } catch (e) {
    console.error('reconciliation report:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
