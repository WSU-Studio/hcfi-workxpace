import { NextResponse } from 'next/server';
import { getServerSession, type Session } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import {
  logConfinsEmployeeSyncFailure,
  runConfinsEmployeeSync,
  CONFINS_EMPLOYEE_SYNC_ENTITY_TYPE,
} from '@/lib/confins/run-employee-sync';
import { isConfinsEmployeeSyncEnabled } from '@/lib/deployment/tenant-features';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function canSyncUsers(session: Session | null): boolean {
  const access = session?.user?.access?.activityAccess;
  return Boolean(access?.editUser || access?.changeAccess);
}

/** Last manual/cron Confins employee sync status for the User Management UI. */
export async function GET() {
  if (!isConfinsEmployeeSyncEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const latest = await prisma.activityHistory.findFirst({
    where: { entityType: CONFINS_EMPLOYEE_SYNC_ENTITY_TYPE },
    orderBy: { timestamp: 'desc' },
    select: {
      timestamp: true,
      details: true,
      user: { select: { name: true } },
    },
  });

  return NextResponse.json({
    latest: latest
      ? {
          timestamp: latest.timestamp,
          userName: latest.user.name,
          details: latest.details,
        }
      : null,
  });
}

/**
 * Manual Confins employee sync from User Management.
 * Requires editUser or changeAccess permission.
 */
export async function POST() {
  if (!isConfinsEmployeeSyncEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canSyncUsers(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { summary } = await runConfinsEmployeeSync({
      trigger: 'manual',
      actorUserId: session.user.id,
    });

    console.log('[USER-MGMT] Confins employee sync completed', summary);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';

    await logConfinsEmployeeSyncFailure({
      trigger: 'manual',
      error: message,
      actorUserId: session.user.id,
    });

    console.error('[USER-MGMT] Confins employee sync failed', message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
