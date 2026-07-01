import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import type { ActivityAccess } from '@/types/access-control';
import { Prisma } from '@prisma/client';
import {
  upsertDataMartStaging,
  type SaveRowWithStaging,
} from '@/lib/data-mart/upsert-staging-for-save';
import {
  budgetForReconciliationInclude,
  type BudgetForReconciliation,
} from '@/lib/data-mart/staging';

export const dynamic = 'force-dynamic';

type SaveRow = SaveRowWithStaging;

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

    const budgetIds = [...new Set(rows.map((r) => r.budgetRequestId))];
    const budgetRows = await prisma.budgetRequest.findMany({
      where: { id: { in: budgetIds } },
      include: budgetForReconciliationInclude,
    });
    const budgetById = new Map(budgetRows.map((b) => [b.id, b]));
    const requestorIds = [
      ...new Set(budgetRows.map((b) => b.requestorId).filter((id): id is string => Boolean(id))),
    ];
    const users = await prisma.user.findMany({
      where: { id: { in: requestorIds } },
      select: { id: true, name: true },
    });
    const userNameById = new Map(users.map((u) => [u.id, u.name]));

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const saved = await tx.reconciliationSavedPayment.upsert({
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
        });

        const br = budgetById.get(row.budgetRequestId);
        if (!br) {
          throw new Error(`Budget request not found: ${row.budgetRequestId}`);
        }

        const requestorId = br.requestorId;
        const requestorName = requestorId ? userNameById.get(requestorId) ?? null : null;

        await upsertDataMartStaging(
          tx,
          saved,
          row,
          br as BudgetForReconciliation,
          requestorName,
        );
      }
    });

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
