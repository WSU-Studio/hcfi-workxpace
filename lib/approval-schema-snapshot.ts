import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type ApprovalSchemaDb = Prisma.TransactionClient | typeof prisma;

export const approvalSchemaSnapshotInclude = {
  approvalLevels: {
    include: {
      role: { select: { roleCode: true, roleName: true } },
      pics: {
        include: {
          user: { select: { id: true, name: true, employeeId: true } },
        },
      },
    },
    orderBy: { stepOrder: 'asc' as const },
  },
} satisfies Prisma.ApprovalSchemaInclude;

export type ApprovalSchemaSnapshotPic = {
  userId: string;
  user?: { id: string; name: string; employeeId: string | null } | null;
};

export type ApprovalSchemaSnapshotLevel = {
  id: string;
  stepOrder: number;
  levelType: string;
  roleId: string;
  picUserIds: string[];
  role: { roleCode: string; roleName: string } | null;
  pics: ApprovalSchemaSnapshotPic[];
};

export type HydratedApprovalSchema = {
  id: string;
  code: string;
  name: string;
  type: string;
  capturedAt: string | null;
  approvalLevels: ApprovalSchemaSnapshotLevel[];
};

export type ApprovalSchemaForSnapshot = {
  id: string;
  code: string;
  name: string;
  type: string;
  approvalLevels: Array<{
    stepOrder: number;
    levelType: string;
    roleId: string;
    role?: { roleCode: string; roleName: string } | null;
    pics?: Array<{
      userId?: string;
      user?: { id: string; name: string; employeeId?: string | null } | null;
    }>;
  }>;
};

type DocumentApprovalSource = {
  approvalSchemaSnapshot?: unknown;
  approvalSchema?: {
    id?: string;
    code?: string;
    name?: string;
    type?: string;
    approvalLevels?: Array<{
      id?: string;
      stepOrder?: number;
      levelType?: string;
      roleId: string;
      picUserIds?: string[];
      role?: { roleCode?: string; roleName?: string } | null;
      pics?: Array<{
        userId: string;
        user?: { id?: string; name?: string; employeeId?: string | null } | null;
      }>;
    }>;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function snapshotPicsFromLevel(
  pics: ApprovalSchemaForSnapshot['approvalLevels'][number]['pics'],
): ApprovalSchemaSnapshotPic[] {
  const result: ApprovalSchemaSnapshotPic[] = [];
  for (const pic of pics ?? []) {
    const userId = pic.user?.id ?? pic.userId;
    if (!userId) continue;
    result.push({
      userId,
      user: pic.user
        ? {
            id: pic.user.id,
            name: pic.user.name,
            employeeId: pic.user.employeeId ?? null,
          }
        : null,
    });
  }
  return result;
}

export function snapshotFromLoadedSchema(
  schema: ApprovalSchemaForSnapshot,
  capturedAt: Date = new Date(),
): Prisma.InputJsonObject {
  const levels = [...schema.approvalLevels].sort((a, b) => a.stepOrder - b.stepOrder);
  return {
    schemaId: schema.id,
    code: schema.code,
    name: schema.name,
    type: schema.type,
    capturedAt: capturedAt.toISOString(),
    levels: levels.map((level) => {
      const pics = snapshotPicsFromLevel(level.pics);
      return {
        id: `${schema.id}:${level.stepOrder}`,
        stepOrder: level.stepOrder,
        levelType: level.levelType,
        roleId: level.roleId,
        roleCode: level.role?.roleCode ?? '',
        roleName: level.role?.roleName ?? '',
        picUserIds: pics.map((pic) => pic.userId),
        pics,
      };
    }),
  };
}

function parseSnapshotLevel(raw: unknown, schemaId: string, index: number): ApprovalSchemaSnapshotLevel | null {
  if (!isRecord(raw)) return null;
  const roleId = asString(raw.roleId);
  if (!roleId) return null;
  const stepOrder = typeof raw.stepOrder === 'number' ? raw.stepOrder : index + 1;
  const nestedRole = isRecord(raw.role) ? raw.role : null;
  const roleCode = asString(raw.roleCode) ?? asString(nestedRole?.roleCode) ?? '';
  const roleName = asString(raw.roleName) ?? asString(nestedRole?.roleName) ?? '';
  const pics: ApprovalSchemaSnapshotPic[] = [];
  if (Array.isArray(raw.pics)) {
    for (const pic of raw.pics) {
      if (!isRecord(pic)) continue;
      const nestedUser = isRecord(pic.user) ? pic.user : null;
      const userId = asString(pic.userId) ?? asString(nestedUser?.id);
      if (!userId) continue;
      pics.push({
        userId,
        user: nestedUser
          ? {
              id: asString(nestedUser.id) ?? userId,
              name: asString(nestedUser.name) ?? '',
              employeeId: asString(nestedUser.employeeId),
            }
          : null,
      });
    }
  }
  const picUserIds = Array.isArray(raw.picUserIds)
    ? raw.picUserIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '')
    : pics.map((pic) => pic.userId);

  return {
    id: asString(raw.id) ?? `${schemaId}:${stepOrder}`,
    stepOrder,
    levelType: asString(raw.levelType) ?? 'Reviewer',
    roleId,
    picUserIds,
    pics,
    role: { roleCode, roleName },
  };
}

export function hydrateApprovalSchemaSnapshot(raw: unknown): HydratedApprovalSchema | null {
  if (!isRecord(raw)) return null;
  const schemaId = asString(raw.schemaId) ?? asString(raw.id);
  if (!schemaId || !Array.isArray(raw.levels)) return null;
  const levels = raw.levels
    .map((level, index) => parseSnapshotLevel(level, schemaId, index))
    .filter((level): level is ApprovalSchemaSnapshotLevel => level != null)
    .sort((a, b) => a.stepOrder - b.stepOrder);

  return {
    id: schemaId,
    code: asString(raw.code) ?? '',
    name: asString(raw.name) ?? '',
    type: asString(raw.type) ?? '',
    capturedAt: asString(raw.capturedAt),
    approvalLevels: levels,
  };
}

export function resolveApprovalSchema(
  snapshot: unknown,
  live?: DocumentApprovalSource['approvalSchema'],
): HydratedApprovalSchema | null {
  const frozen = hydrateApprovalSchemaSnapshot(snapshot);
  if (frozen) return frozen;
  if (!live?.id) return null;
  return {
    id: live.id,
    code: live.code ?? '',
    name: live.name ?? '',
    type: live.type ?? '',
    capturedAt: null,
    approvalLevels: (live.approvalLevels ?? []).map((level, index) => ({
      id: level.id ?? `${live.id}:${level.stepOrder ?? index + 1}`,
      stepOrder: level.stepOrder ?? index + 1,
      levelType: level.levelType ?? 'Reviewer',
      roleId: level.roleId,
      picUserIds: level.picUserIds ?? (level.pics ?? []).map((pic) => pic.userId),
      pics: (level.pics ?? []).map((pic) => ({
        userId: pic.userId,
        user: pic.user
          ? {
              id: pic.user.id ?? pic.userId,
              name: pic.user.name ?? '',
              employeeId: pic.user.employeeId ?? null,
            }
          : null,
      })),
      role: {
        roleCode: level.role?.roleCode ?? '',
        roleName: level.role?.roleName ?? '',
      },
    })),
  };
}

export function approvalLevelsOf(
  doc: DocumentApprovalSource | null | undefined,
): ApprovalSchemaSnapshotLevel[] {
  if (!doc) return [];
  return resolveApprovalSchema(doc.approvalSchemaSnapshot, doc.approvalSchema)?.approvalLevels ?? [];
}

export function withFrozenApprovalSchema<T extends DocumentApprovalSource>(
  doc: T,
): Omit<T, 'approvalSchemaSnapshot' | 'approvalSchema'> & {
  approvalSchema: HydratedApprovalSchema | null;
} {
  const { approvalSchemaSnapshot, approvalSchema, ...rest } = doc;
  return {
    ...rest,
    approvalSchema: resolveApprovalSchema(approvalSchemaSnapshot, approvalSchema),
  };
}

export async function captureApprovalSchemaSnapshot(
  schemaId: string,
  db: ApprovalSchemaDb = prisma,
): Promise<{ ok: true; snapshot: Prisma.InputJsonValue } | { ok: false; error: string }> {
  const schema = await db.approvalSchema.findUnique({
    where: { id: schemaId },
    include: approvalSchemaSnapshotInclude,
  });
  if (!schema) return { ok: false, error: 'Approval schema not found' };
  return { ok: true, snapshot: snapshotFromLoadedSchema(schema) };
}

export async function snapshotForDocumentWrite(params: {
  schemaId: string | null | undefined;
  previousSchemaId?: string | null;
  previousSnapshot?: unknown;
  db?: ApprovalSchemaDb;
}): Promise<
  | { ok: true; snapshot: Prisma.InputJsonValue | typeof Prisma.DbNull }
  | { ok: false; error: string }
> {
  const schemaId = params.schemaId?.trim() || null;
  if (!schemaId) return { ok: true, snapshot: Prisma.DbNull };

  const previousSnapshot = hydrateApprovalSchemaSnapshot(params.previousSnapshot);
  const schemaUnchanged = Boolean(params.previousSchemaId) && params.previousSchemaId === schemaId;
  if (schemaUnchanged && previousSnapshot) {
    return { ok: true, snapshot: params.previousSnapshot as Prisma.InputJsonValue };
  }

  return captureApprovalSchemaSnapshot(schemaId, params.db ?? prisma);
}
