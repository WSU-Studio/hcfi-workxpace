import { prisma } from '@/lib/prisma';

type SyncEntityType = 'ConfinsSyncDepartment' | 'ConfinsSyncCostCenter';

export async function getLatestSyncActivity(entityType: SyncEntityType) {
  const row = await prisma.activityHistory.findFirst({
    where: { entityType },
    orderBy: { timestamp: 'desc' },
    select: {
      id: true,
      action: true,
      details: true,
      timestamp: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    action: row.action,
    timestamp: row.timestamp,
    user: row.user,
    details: row.details,
  };
}
