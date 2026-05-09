import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import type { ActivityAccess } from '@/types/access-control';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type SaveRow = {
  confinsPaymentDocId: string;
  budgetRequestId: string;
  matchType: string;
  incomingReferenceId: string;
  paidAmount: number;
  expectedAmount: number;
  fiscalYear: number;
  month: number;
  departmentId?: string | null;
  voucherNumber?: string | null;
  paymentDescription?: string | null;
  paymentSource?: string | null;
  glAccountCode?: string | null;
  glAccountName?: string | null;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activity = session.user.access?.activityAccess as ActivityAccess | undefined;
    if (!activity?.saveReconciliationResult) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as { rows?: SaveRow[] };
    const rows = body.rows ?? [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows to save' }, { status: 400 });
    }

    const userId = session.user.id;

    await prisma.$transaction(
      rows.map((row) =>
        prisma.reconciliationSavedPayment.upsert({
          where: { confinsPaymentDocId: row.confinsPaymentDocId },
          create: {
            confinsPaymentDocId: row.confinsPaymentDocId,
            budgetRequestId: row.budgetRequestId,
            matchType: row.matchType,
            incomingReferenceId: row.incomingReferenceId,
            paidAmount: new Prisma.Decimal(row.paidAmount),
            expectedAmount: new Prisma.Decimal(row.expectedAmount),
            fiscalYear: row.fiscalYear,
            month: row.month,
            departmentId: row.departmentId ?? null,
            voucherNumber: row.voucherNumber ?? null,
            paymentDescription: row.paymentDescription ?? null,
            paymentSource: row.paymentSource ?? null,
            glAccountCode: row.glAccountCode ?? null,
            glAccountName: row.glAccountName ?? null,
            savedByUserId: userId,
          },
          update: {
            budgetRequestId: row.budgetRequestId,
            matchType: row.matchType,
            incomingReferenceId: row.incomingReferenceId,
            paidAmount: new Prisma.Decimal(row.paidAmount),
            expectedAmount: new Prisma.Decimal(row.expectedAmount),
            fiscalYear: row.fiscalYear,
            month: row.month,
            departmentId: row.departmentId ?? null,
            voucherNumber: row.voucherNumber ?? null,
            paymentDescription: row.paymentDescription ?? null,
            paymentSource: row.paymentSource ?? null,
            glAccountCode: row.glAccountCode ?? null,
            glAccountName: row.glAccountName ?? null,
            savedByUserId: userId,
            savedAt: new Date(),
          },
        })
      )
    );

    await logActivity({
      userId,
      entityType: 'Reconciliation',
      entityId: 'batch-save',
      action: 'update',
      details: { savedCount: rows.length },
    });

    return NextResponse.json({ ok: true, savedCount: rows.length });
  } catch (e) {
    console.error('reconciliation save:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
