import { NextResponse } from 'next/server';

import {
  logConfinsEmployeeSyncFailure,
  runConfinsEmployeeSync,
} from '@/lib/confins/run-employee-sync';
import { verifyCronSecret } from '@/lib/cron/verify-cron-secret';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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
    const { summary } = await runConfinsEmployeeSync({ trigger: 'cron' });
    console.log('[CRON] Confins employee sync completed', summary);
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    await logConfinsEmployeeSyncFailure({ trigger: 'cron', error: message });
    console.error('[CRON] Confins employee sync failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
