import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

export type ActivityAction = 'create' | 'update' | 'review' | 'approve' | 'reject' | 'delete';

export async function logActivity(params: {
  userId: string;
  entityType: string;
  entityId: string;
  entityCode?: string;
  action: ActivityAction;
  details: Record<string, unknown>;
}) {
  try {
    await prisma.activityHistory.create({
      data: {
        userId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId,
        entityCode: params.entityCode ?? null,
        action: params.action,
        details: params.details as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Non-blocking; don't fail the main operation
  }
}
