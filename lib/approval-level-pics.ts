import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const approvalLevelPicsSelect = {
  pics: { select: { userId: true } },
} as const;

export const approvalLevelPicsWithUserInclude = {
  pics: {
    include: {
      user: { select: { id: true, name: true, employeeId: true } },
    },
  },
} as const;

export type ApprovalLevelPicRef = { userId: string };

export type ApprovalLevelWithPics = {
  roleId: string;
  picUserIds?: string[];
  pics?: ApprovalLevelPicRef[];
};

export function picUserIdsFromLevel(level: ApprovalLevelWithPics): string[] {
  if (level.picUserIds && level.picUserIds.length > 0) return [...new Set(level.picUserIds)];
  return [...new Set((level.pics ?? []).map((pic) => pic.userId))];
}

export function usersHoldingRoleWhere(roleId: string): Prisma.UserWhereInput {
  return {
    isActive: true,
    OR: [{ roleId }, { userRoles: { some: { roleId } } }],
  };
}

export function parsePicUserIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw.filter((id): id is string => typeof id === 'string' && id.trim() !== '').map((id) => id.trim()),
    ),
  ];
}

export async function assertPicsHoldRole(
  picUserIds: string[],
  roleId: string,
): Promise<string | null> {
  if (picUserIds.length === 0) return null;
  const users = await prisma.user.findMany({
    where: {
      id: { in: picUserIds },
      ...usersHoldingRoleWhere(roleId),
    },
    select: { id: true },
  });
  if (users.length !== picUserIds.length) {
    return 'Specific PIC must be active users who hold the selected role';
  }
  return null;
}

export async function validateApprovalLevelDrafts(
  levels: Array<{
    levelType?: string;
    roleId?: string;
    picUserIds?: unknown;
    parallelGroup?: number;
  }>,
): Promise<
  | {
      ok: true;
      prepared: Array<{
        levelType: string;
        roleId: string;
        picUserIds: string[];
        parallelGroup: number;
      }>;
    }
  | { ok: false; error: string }
> {
  const prepared: Array<{
    levelType: string;
    roleId: string;
    picUserIds: string[];
    parallelGroup: number;
  }> = [];
  for (let i = 0; i < levels.length; i++) {
    const roleId = String(levels[i].roleId ?? '').trim();
    if (!roleId) return { ok: false, error: 'Select job position for each level' };
    const picUserIds = parsePicUserIds(levels[i].picUserIds);
    const picError = await assertPicsHoldRole(picUserIds, roleId);
    if (picError) return { ok: false, error: picError };
    prepared.push({
      levelType: levels[i].levelType || 'Reviewer',
      roleId,
      picUserIds,
      parallelGroup: levels[i].parallelGroup ?? 0,
    });
  }
  return { ok: true, prepared };
}

export async function createApprovalLevelsForSchema(
  schemaId: string,
  levels: Array<{
    levelType?: string;
    roleId?: string;
    picUserIds?: unknown;
    parallelGroup?: number;
  }>,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const validated = await validateApprovalLevelDrafts(levels);
  if (!validated.ok) return validated;
  for (let i = 0; i < validated.prepared.length; i++) {
    const row = validated.prepared[i];
    const level = await db.approvalLevel.create({
      data: {
        schemaId,
        stepOrder: i + 1,
        levelType: row.levelType,
        roleId: row.roleId,
        parallelGroup: row.parallelGroup,
      },
    });
    if (row.picUserIds.length > 0) {
      await db.approvalLevelPic.createMany({
        data: row.picUserIds.map((userId) => ({ approvalLevelId: level.id, userId })),
      });
    }
  }
  return { ok: true };
}

/**
 * Recipients for a schema event: requestor + eligible users per level.
 * A level with Specific PICs contributes only those users; otherwise every
 * active holder of the level's role (legacy behaviour).
 */
export async function resolveSchemaNotificationUserIds(params: {
  levels: ApprovalLevelWithPics[];
  requestorId: string | null | undefined;
  actorUserId: string;
}): Promise<string[]> {
  const { levels, requestorId, actorUserId } = params;
  const unrestrictedRoleIds = [
    ...new Set(levels.filter((level) => picUserIdsFromLevel(level).length === 0).map((level) => level.roleId)),
  ].filter(Boolean);
  const picUserIds = [...new Set(levels.flatMap((level) => picUserIdsFromLevel(level)))];

  const orFilters: Prisma.UserWhereInput[] = [];
  if (requestorId) orFilters.push({ id: requestorId });
  if (unrestrictedRoleIds.length > 0) {
    orFilters.push({ roleId: { in: unrestrictedRoleIds } });
    orFilters.push({ userRoles: { some: { roleId: { in: unrestrictedRoleIds } } } });
  }
  if (picUserIds.length > 0) orFilters.push({ id: { in: picUserIds } });
  if (orFilters.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { isActive: true, OR: orFilters },
    select: { id: true },
  });

  return Array.from(new Set(users.map((user) => user.id))).filter((id) => id !== actorUserId);
}
