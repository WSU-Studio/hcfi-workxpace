import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import type { MenuAccess } from '@/types/access-control';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

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
    const originOffice = searchParams.get('originOffice') ?? '';
    const vendorName = searchParams.get('vendorName') ?? '';

    const limitRaw = searchParams.get('limit');
    const offsetRaw = searchParams.get('offset');
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, limitRaw ? parseInt(limitRaw, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT)
    );
    const offset = Math.max(0, offsetRaw ? parseInt(offsetRaw, 10) || 0 : 0);

    const where: Prisma.DataMartStagingRowWhereInput = {};
    if (fy != null && fy !== '') {
      const n = parseInt(fy, 10);
      if (!Number.isNaN(n)) where.fiscalYear = n;
    }
    if (mo != null && mo !== '') {
      const n = parseInt(mo, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 12) where.month = n;
    }
    if (departmentId) where.departmentId = departmentId;
    if (originOffice) where.originOffice = { contains: originOffice, mode: 'insensitive' };
    if (vendorName) where.vendorName = { contains: vendorName, mode: 'insensitive' };

    const [total, rows] = await prisma.$transaction([
      prisma.dataMartStagingRow.count({ where }),
      prisma.dataMartStagingRow.findMany({
        where,
        orderBy: [{ fiscalYear: 'desc' }, { month: 'desc' }, { savedAt: 'desc' }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          confinsPaymentDocId: true,
          budgetRequestCode: true,
          fiscalYear: true,
          month: true,
          period: true,
          quarter: true,
          originOffice: true,
          divisionName: true,
          departmentName: true,
          requestorName: true,
          incomingReferenceId: true,
          voucherNumber: true,
          paymentDescription: true,
          paymentSource: true,
          glAccountCode: true,
          glAccountName: true,
          paidAmount: true,
          expectedAmount: true,
          currencyCode: true,
          businessRole: true,
          activityCode: true,
          subActivityCode: true,
          activityLabel: true,
          subActivityLabel: true,
          vendorName: true,
          interfaceId: true,
          paymentRequestNo: true,
          matchType: true,
          savedAt: true,
          confinsPayloadRaw: true,
          budgetRequestSnapshot: true,
        },
      }),
    ]);

    const serialized = rows.map((r) => ({
      ...r,
      paidAmount: r.paidAmount.toString(),
      expectedAmount: r.expectedAmount.toString(),
      savedAt: r.savedAt.toISOString(),
    }));

    return NextResponse.json({ rows: serialized, total, limit, offset });
  } catch (e) {
    console.error('data mart staging:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
