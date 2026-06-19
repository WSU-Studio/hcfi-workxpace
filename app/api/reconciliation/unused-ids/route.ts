import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import {
  buildPaymentSignature,
  isUsablePaymentSignature,
} from '@/lib/integrations/confins/payment-signature';
import type { MenuAccess } from '@/types/access-control';

export const dynamic = 'force-dynamic';

/**
 * ID + secondary signatures dari pembayaran Confins yang ditandai "Marked Unused".
 *
 * Client memakai dua jalur match:
 *   - `ids`         : match exact `payment.id` (kasus normal forward-going)
 *   - `signatures`  : match by composite `interfaceId+paymentRequestNo+glAccountCode+amount`
 *                     sebagai fallback untuk record yang dibuat sebelum perubahan
 *                     algoritma stableRowId (atau bila Confins mengubah skema row).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const menuAccess = session.user.access?.menuAccess as MenuAccess | undefined;
    if (!menuAccess?.reconciliation) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await prisma.reconciliationUnusedPayment.findMany({
      select: {
        confinsPaymentDocId: true,
        paymentRequestNo: true,
        journalNo: true,
        glAccountCode: true,
        paidAmount: true,
      },
    });

    const ids = rows.map((r) => r.confinsPaymentDocId);
    const signatures = Array.from(
      new Set(
        rows
          .map((r) =>
            buildPaymentSignature({
              paymentRequestNo: r.paymentRequestNo,
              journalNo: r.journalNo,
              glAccountCode: r.glAccountCode,
              paidAmount: r.paidAmount.toString(),
            })
          )
          .filter(isUsablePaymentSignature)
      )
    );

    return NextResponse.json({ ids, signatures });
  } catch (e) {
    console.error('reconciliation unused-ids:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
