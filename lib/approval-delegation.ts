import { prisma } from '@/lib/prisma';

export type ApprovalDelegationListStatus = 'Scheduled' | 'Active' | 'Expired' | 'Cancelled';

export type ActorDelegationContext = {
  actorHasOutbound: boolean;
  inboundDelegators: Array<{ userId: string; name: string; roleIds: string[] }>;
};

/** Start of calendar day (local) for inclusive range checks. */
export function startOfDelegationDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End of calendar day (local) so endDate is inclusive. */
export function endOfDelegationDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function deriveDelegationListStatus(params: {
  status: string;
  startDate: Date;
  endDate: Date;
  at?: Date;
}): ApprovalDelegationListStatus {
  if (params.status === 'Cancelled') return 'Cancelled';
  const at = params.at ?? new Date();
  const start = startOfDelegationDay(params.startDate);
  const end = endOfDelegationDay(params.endDate);
  if (at < start) return 'Scheduled';
  if (at > end) return 'Expired';
  return 'Active';
}

/** Rows stored with start=startOfDay and end=endOfDay; compare against `at` directly. */
function activeWindowFilter(at: Date) {
  return {
    status: 'Active' as const,
    startDate: { lte: at },
    endDate: { gte: at },
  };
}

async function roleIdsForUser(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roleId: true,
      userRoles: { select: { roleId: true } },
    },
  });
  if (!user) return [];
  return Array.from(new Set([user.roleId, ...user.userRoles.map((ur) => ur.roleId)]));
}

/**
 * Loads outbound/inbound active delegations for one actor (mode A: full substitute).
 */
export async function loadActorDelegationContext(
  actorUserId: string,
  at: Date = new Date(),
): Promise<ActorDelegationContext> {
  const window = activeWindowFilter(at);
  const [outbound, inbound] = await Promise.all([
    prisma.approvalDelegation.findFirst({
      where: { ...window, delegatorUserId: actorUserId },
      select: { id: true },
    }),
    prisma.approvalDelegation.findMany({
      where: { ...window, delegateUserId: actorUserId },
      select: {
        delegatorUserId: true,
        delegator: { select: { id: true, name: true } },
      },
    }),
  ]);

  const inboundDelegators = await Promise.all(
    inbound.map(async (row) => ({
      userId: row.delegatorUserId,
      name: row.delegator.name,
      roleIds: await roleIdsForUser(row.delegatorUserId),
    })),
  );

  return {
    actorHasOutbound: Boolean(outbound),
    inboundDelegators,
  };
}

/** Replace active outbound delegators with their delegates in a recipient set. */
export async function remapNotificationUserIds(
  userIds: string[],
  at: Date = new Date(),
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const window = activeWindowFilter(at);
  const outbound = await prisma.approvalDelegation.findMany({
    where: { ...window, delegatorUserId: { in: userIds } },
    select: { delegatorUserId: true, delegateUserId: true },
  });
  if (outbound.length === 0) return [...new Set(userIds)];

  const replace = new Map(outbound.map((row) => [row.delegatorUserId, row.delegateUserId]));
  const next = new Set<string>();
  for (const id of userIds) {
    next.add(replace.get(id) ?? id);
  }
  return Array.from(next);
}

export async function findOverlappingDelegation(params: {
  delegatorUserId: string;
  startDate: Date;
  endDate: Date;
  excludeId?: string;
}) {
  const start = startOfDelegationDay(params.startDate);
  const end = endOfDelegationDay(params.endDate);
  return prisma.approvalDelegation.findFirst({
    where: {
      status: 'Active',
      delegatorUserId: params.delegatorUserId,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: { id: true, startDate: true, endDate: true },
  });
}
