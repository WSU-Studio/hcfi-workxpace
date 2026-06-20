import { NextResponse } from 'next/server';

import { logActivity } from '@/lib/activity';
import { syncAllUsersFromConfins } from '@/lib/confins/employee-sync';
import { verifyCronSecret } from '@/lib/cron/verify-cron-secret';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SYNC_ENTITY_TYPE = 'ConfinsSyncEmployees';

async function resolveActivityUserId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: {
      isActive: true,
      userRoles: { some: { role: { roleCode: 'ADMIN' } } },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return admin?.id ?? null;
}

/**
 * Scheduled Confins → Workxpace employee sync.
 *
 * Triggered externally (GitHub Actions Option A, or server crontab Option B).
 * Protected by `CRON_SECRET` bearer token — not session auth.
 *
 * POST /api/cron/sync-confins-employees
 * Authorization: Bearer {CRON_SECRET}
 */
export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on this server' },
      { status: 503 },
    );
  }

  try {
    const summary = await syncAllUsersFromConfins();

    const activityUserId = await resolveActivityUserId();
    if (activityUserId) {
      await logActivity({
        userId: activityUserId,
        entityType: SYNC_ENTITY_TYPE,
        entityId: 'confins-employees',
        entityCode: 'CONFINS-EMPLOYEES',
        action: 'update',
        details: {
          status: 'success',
          trigger: 'cron',
          summary,
        },
      });
    }

    console.log('[CRON] Confins employee sync completed', summary);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';

    const activityUserId = await resolveActivityUserId();
    if (activityUserId) {
      await logActivity({
        userId: activityUserId,
        entityType: SYNC_ENTITY_TYPE,
        entityId: 'confins-employees',
        entityCode: 'CONFINS-EMPLOYEES',
        action: 'update',
        details: {
          status: 'failed',
          trigger: 'cron',
          error: message,
        },
      });
    }

    console.error('[CRON] Confins employee sync failed', message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
