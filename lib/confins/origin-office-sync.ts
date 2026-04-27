import { prisma } from '@/lib/prisma';
import { OriginOfficeOption } from './master-sync';
import type { Prisma } from '@prisma/client';

export const ORIGIN_OFFICE_SYNC_ENTITY_TYPE = 'ConfinsSyncOriginOffice';

type OriginOfficeSyncDetails = {
  status?: string;
  error?: string;
  summary?: {
    sourceCount: number;
    created: number;
    updated: number;
    deactivated: number;
  };
  offices?: OriginOfficeOption[];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseOffices = (value: unknown): OriginOfficeOption[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isObject(item)) return null;
      const code = typeof item.code === 'string' ? item.code.trim() : '';
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!code || !name) return null;
      return {
        code,
        name,
        address: typeof item.address === 'string' ? item.address : null,
        officeType: typeof item.officeType === 'string' ? item.officeType : null,
        isActive: Boolean(item.isActive),
      } satisfies OriginOfficeOption;
    })
    .filter((item): item is OriginOfficeOption => item !== null);
};

const parseDetails = (value: unknown): OriginOfficeSyncDetails => {
  if (!isObject(value)) return {};
  return {
    status: typeof value.status === 'string' ? value.status : undefined,
    error: typeof value.error === 'string' ? value.error : undefined,
    summary: isObject(value.summary)
      ? {
          sourceCount: Number(value.summary.sourceCount ?? 0),
          created: Number(value.summary.created ?? 0),
          updated: Number(value.summary.updated ?? 0),
          deactivated: Number(value.summary.deactivated ?? 0),
        }
      : undefined,
    offices: parseOffices(value.offices),
  };
};

export async function getLatestOriginOfficeSync() {
  const row = await prisma.activityHistory.findFirst({
    where: { entityType: ORIGIN_OFFICE_SYNC_ENTITY_TYPE },
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
  const details = parseDetails(row.details);

  return {
    id: row.id,
    action: row.action,
    timestamp: row.timestamp,
    user: row.user,
    details,
    offices: details.offices ?? [],
  };
}

export async function saveOriginOfficeSnapshot(params: {
  userId: string;
  status: 'success' | 'manual' | 'failed';
  offices: OriginOfficeOption[];
  summary?: {
    sourceCount: number;
    created: number;
    updated: number;
    deactivated: number;
  };
  error?: string;
}) {
  await prisma.activityHistory.create({
    data: {
      userId: params.userId,
      entityType: ORIGIN_OFFICE_SYNC_ENTITY_TYPE,
      entityId: 'confins-origin-office',
      entityCode: 'CONFINS-ORIGIN-OFFICE',
      action: 'update',
      details: {
        status: params.status,
        summary:
          params.summary ?? {
            sourceCount: params.offices.length,
            created: 0,
            updated: 0,
            deactivated: params.offices.filter((office) => !office.isActive).length,
          },
        error: params.error,
        offices: params.offices,
      } as Prisma.InputJsonValue,
    },
  });
}
