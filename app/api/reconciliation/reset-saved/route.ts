import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import type { ActivityAccess } from '@/types/access-control';
import type { MenuAccess } from '@/types/access-control';
import { isReconciliationResetAllowed } from '@/lib/reconciliation/reset-allowed';

export const dynamic = 'force-dynamic';

/**
 * Menghapus semua baris reconciliation_saved_payments (dan data_mart_staging terkait via CASCADE).
 * Hanya jika reset diizinkan oleh environment (dev atau RECONCILIATION_ALLOW_RESET).
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const menuAccess = session.user.access?.menuAccess as MenuAccess | undefined;
    if (!menuAccess?.reconciliation) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const activity = session.user.access?.activityAccess as ActivityAccess | undefined;
    if (!activity?.saveReconciliationResult) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isReconciliationResetAllowed()) {
      return NextResponse.json(
        {
          error: 'Reset disabled',
          hint: 'Set RECONCILIATION_ALLOW_RESET=true or run in NODE_ENV=development.',
        },
        { status: 403 }
      );
    }

    const count = await prisma.reconciliationSavedPayment.count();
    await prisma.reconciliationSavedPayment.deleteMany({});

    await logActivity({
      userId: session.user.id,
      entityType: 'Reconciliation',
      entityId: 'reset-saved',
      action: 'delete',
      details: { deletedSavedPayments: count },
    });

    return NextResponse.json({ ok: true, deletedCount: count });
  } catch (e) {
    console.error('reconciliation reset-saved:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
