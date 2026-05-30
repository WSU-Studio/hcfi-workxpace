import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import type { ActivityAccess, MenuAccess } from '@/types/access-control';

export const dynamic = 'force-dynamic';

type MarkUnusedRow = {
  confinsPaymentDocId: string;
  interfaceId?: string | null;
  paymentRequestNo?: string | null;
  journalNo?: string | null;
  invoiceNo?: string | null;
  invoiceDate?: string | null;
  fiscalYear: number;
  month: number;
  departmentId?: string | null;
  departmentName?: string | null;
  paymentSource?: string | null;
  paidAmount: number | string;
  currency?: string | null;
  glAccountCode?: string | null;
  glAccountName?: string | null;
  vendorName?: string | null;
  description?: string | null;
  reason?: string | null;
};

/** GET — daftar lengkap baris yang ditandai Marked Unused (untuk halaman manajemen). */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const menuAccess = session.user.access?.menuAccess as MenuAccess | undefined;
    if (!menuAccess?.reconciliation) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await prisma.reconciliationUnusedPayment.findMany({
      orderBy: { markedAt: 'desc' },
      include: {
        markedBy: { select: { id: true, name: true } },
        department: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json({
      rows: rows.map((r) => ({
        id: r.id,
        confinsPaymentDocId: r.confinsPaymentDocId,
        interfaceId: r.interfaceId,
        paymentRequestNo: r.paymentRequestNo,
        journalNo: r.journalNo,
        invoiceNo: r.invoiceNo,
        invoiceDate: r.invoiceDate,
        fiscalYear: r.fiscalYear,
        month: r.month,
        departmentId: r.departmentId,
        departmentName: r.departmentName ?? r.department?.name ?? null,
        departmentCode: r.department?.code ?? null,
        paymentSource: r.paymentSource,
        paidAmount: r.paidAmount.toString(),
        currency: r.currency,
        glAccountCode: r.glAccountCode,
        glAccountName: r.glAccountName,
        vendorName: r.vendorName,
        description: r.description,
        reason: r.reason,
        markedAt: r.markedAt.toISOString(),
        markedByName: r.markedBy?.name ?? '-',
      })),
    });
  } catch (e) {
    console.error('reconciliation unused list:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

/** POST — tandai baris-baris pembayaran sebagai Marked Unused. */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activity = session.user.access?.activityAccess as ActivityAccess | undefined;
    if (!activity?.editReconciliationMapping) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as { rows?: MarkUnusedRow[] };
    const rows = body.rows ?? [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows to mark' }, { status: 400 });
    }

    const userId = session.user.id;

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        await tx.reconciliationUnusedPayment.upsert({
          where: { confinsPaymentDocId: row.confinsPaymentDocId },
          create: {
            confinsPaymentDocId: row.confinsPaymentDocId,
            interfaceId: row.interfaceId ?? null,
            paymentRequestNo: row.paymentRequestNo ?? null,
            journalNo: row.journalNo ?? null,
            invoiceNo: row.invoiceNo ?? null,
            invoiceDate: row.invoiceDate ?? null,
            fiscalYear: row.fiscalYear,
            month: row.month,
            departmentId: row.departmentId ?? null,
            departmentName: row.departmentName ?? null,
            paymentSource: row.paymentSource ?? null,
            paidAmount: new Prisma.Decimal(row.paidAmount ?? 0),
            currency: row.currency ?? null,
            glAccountCode: row.glAccountCode ?? null,
            glAccountName: row.glAccountName ?? null,
            vendorName: row.vendorName ?? null,
            description: row.description ?? null,
            reason: row.reason ?? null,
            markedByUserId: userId,
          },
          update: {
            reason: row.reason ?? null,
            markedByUserId: userId,
            markedAt: new Date(),
          },
        });
      }
    });

    await logActivity({
      userId,
      entityType: 'Reconciliation',
      entityId: 'mark-unused',
      action: 'update',
      details: { markedCount: rows.length },
    });

    return NextResponse.json({ ok: true, markedCount: rows.length });
  } catch (e) {
    console.error('reconciliation mark unused:', e);
    return NextResponse.json({ error: 'Failed to mark unused' }, { status: 500 });
  }
}

/** DELETE — restore (hapus dari unused list) berdasarkan confinsPaymentDocId list. */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activity = session.user.access?.activityAccess as ActivityAccess | undefined;
    if (!activity?.editReconciliationMapping) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as { confinsPaymentDocIds?: string[] };
    const ids = body.confinsPaymentDocIds ?? [];
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs to restore' }, { status: 400 });
    }

    const result = await prisma.reconciliationUnusedPayment.deleteMany({
      where: { confinsPaymentDocId: { in: ids } },
    });

    await logActivity({
      userId: session.user.id,
      entityType: 'Reconciliation',
      entityId: 'restore-unused',
      action: 'delete',
      details: { restoredCount: result.count },
    });

    return NextResponse.json({ ok: true, restoredCount: result.count });
  } catch (e) {
    console.error('reconciliation restore unused:', e);
    return NextResponse.json({ error: 'Failed to restore' }, { status: 500 });
  }
}
