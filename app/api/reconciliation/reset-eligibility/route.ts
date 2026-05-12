import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import type { MenuAccess } from '@/types/access-control';
import { isReconciliationResetAllowed } from '@/lib/reconciliation/reset-allowed';

export const dynamic = 'force-dynamic';

/** Memberi tahu UI apakah tombol reset testing boleh ditampilkan (tanpa eksekusi). */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const menuAccess = session.user.access?.menuAccess as MenuAccess | undefined;
    if (!menuAccess?.reconciliation) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const enabled = isReconciliationResetAllowed();
    return NextResponse.json({ enabled });
  } catch (e) {
    console.error('reset-eligibility:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
