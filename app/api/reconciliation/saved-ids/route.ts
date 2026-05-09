import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import type { MenuAccess } from '@/types/access-control';

export const dynamic = 'force-dynamic';

/** ID dokumen pembayaran Confins yang sudah disimpan (matched) — disembunyikan dari daftar kerja. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const menuAccess = session.user.access?.menuAccess as MenuAccess | undefined;
    if (!menuAccess?.reconciliation) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await prisma.reconciliationSavedPayment.findMany({
      select: { confinsPaymentDocId: true },
    });

    return NextResponse.json({ ids: rows.map((r) => r.confinsPaymentDocId) });
  } catch (e) {
    console.error('reconciliation saved-ids:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
