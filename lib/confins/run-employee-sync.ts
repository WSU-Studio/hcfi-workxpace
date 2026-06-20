import { logActivity } from '@/lib/activity';
import {
  syncAllUsersFromConfins,
  type ConfinsEmployeeSyncSummary,
} from '@/lib/confins/employee-sync';
import { prisma } from '@/lib/prisma';

export const CONFINS_EMPLOYEE_SYNC_ENTITY_TYPE = 'ConfinsSyncEmployees';

export type ConfinsEmployeeSyncTrigger = 'cron' | 'manual';

export type ConfinsEmployeeSyncResult = {
  summary: ConfinsEmployeeSyncSummary;
};

async function resolveFallbackActivityUserId(): Promise<string | null> {
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
 * Run Confins → Workxpace employee sync and record activity history.
 *
 * Shared by the cron endpoint (Option A/B scheduler) and the User Management
 * manual "Sync from Confins" button so both paths stay behaviourally identical.
 */
export async function runConfinsEmployeeSync(params: {
  trigger: ConfinsEmployeeSyncTrigger;
  /** Actor for activity log — cron falls back to first ADMIN when omitted. */
  actorUserId?: string | null;
}): Promise<ConfinsEmployeeSyncResult> {
  const summary = await syncAllUsersFromConfins();
  const activityUserId =
    params.actorUserId ?? (await resolveFallbackActivityUserId());

  if (activityUserId) {
    await logActivity({
      userId: activityUserId,
      entityType: CONFINS_EMPLOYEE_SYNC_ENTITY_TYPE,
      entityId: 'confins-employees',
      entityCode: 'CONFINS-EMPLOYEES',
      action: 'update',
      details: {
        status: 'success',
        trigger: params.trigger,
        summary,
      },
    });
  }

  return { summary };
}

export async function logConfinsEmployeeSyncFailure(params: {
  trigger: ConfinsEmployeeSyncTrigger;
  error: string;
  actorUserId?: string | null;
}): Promise<void> {
  const activityUserId =
    params.actorUserId ?? (await resolveFallbackActivityUserId());

  if (!activityUserId) return;

  await logActivity({
    userId: activityUserId,
    entityType: CONFINS_EMPLOYEE_SYNC_ENTITY_TYPE,
    entityId: 'confins-employees',
    entityCode: 'CONFINS-EMPLOYEES',
    action: 'update',
    details: {
      status: 'failed',
      trigger: params.trigger,
      error: params.error,
    },
  });
}
