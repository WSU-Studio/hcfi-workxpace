import { prisma } from '@/lib/prisma';
import {
  countCompletedApprovalSteps,
  type BudgetPlanHistoryEntry,
} from '@/lib/budget-plan-approval-display';

export async function getBudgetPlanUserRoleIds(userId: string): Promise<string[]> {
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

export type ApprovalLevel = {
  stepOrder: number;
  roleId: string;
  levelType: string;
  picUserIds?: string[];
  pics?: { userId: string }[];
};

export function picUserIdsForLevel(level: ApprovalLevel): string[] {
  if (level.picUserIds && level.picUserIds.length > 0) return level.picUserIds;
  return (level.pics ?? []).map((pic) => pic.userId);
}

export function userIsEligibleForLevel(
  level: ApprovalLevel,
  actorUserId: string,
  userRoleIds: string[],
): boolean {
  if (!userRoleIds.includes(level.roleId)) return false;
  const picUserIds = picUserIdsForLevel(level);
  if (picUserIds.length === 0) return true;
  return picUserIds.includes(actorUserId);
}

/**
 * Next pending approval step in the current cycle, accounting for multi-step
 * schemas. Returns `null` when:
 *   - The schema has no levels.
 *   - The request is in a terminal state (`Approved`, `Declined`).
 *   - The request is waiting for the requestor to act (`Revision`).
 *   - Every step in the schema has already been completed in this cycle.
 *
 * `histories` must be the entity's activity history (any order) so we can
 * count how many approve events have happened *in the current cycle* (since
 * the last `Draft` reset). Counting from history — rather than inferring
 * from status alone — is what makes 3- and 4-step ladders progress past the
 * second level instead of getting stuck.
 */
export function getNextApprovalStep(
  status: string,
  levels: ApprovalLevel[],
  histories: BudgetPlanHistoryEntry[],
): ApprovalLevel | null {
  const ordered = [...levels].sort((a, b) => a.stepOrder - b.stepOrder);
  if (!ordered.length) return null;
  if (status === 'Approved' || status === 'Declined' || status === 'Revision') return null;
  const completed = countCompletedApprovalSteps(histories);
  return ordered[completed] ?? null;
}

/**
 * Returns `true` when the next pending step in this cycle is the FINAL step
 * of the schema (the `Approver` level per seed convention). Frontend uses
 * this to switch the action button label from "Approve" to "Final approve".
 */
export function isNextStepFinal(
  status: string,
  levels: ApprovalLevel[],
  histories: BudgetPlanHistoryEntry[],
): boolean {
  const ordered = [...levels].sort((a, b) => a.stepOrder - b.stepOrder);
  const next = getNextApprovalStep(status, ordered, histories);
  if (!next) return false;
  return next.stepOrder === ordered[ordered.length - 1]!.stepOrder;
}

/**
 * Gate the reviewer action on the current pending step.
 *
 * The document requestor may still act when they are the PIC (or an
 * unrestricted role holder) of that step. A creator who also sits in the
 * approval schema must approve their own BP/BR/PR when the ladder reaches
 * their level — otherwise the document stays stuck with no Review action.
 * `requestorId` stays on the signature so existing callers compile; it is
 * not a deny rule.
 */
export function canUserActOnCurrentStep(params: {
  status: string;
  approvalLevels: ApprovalLevel[];
  histories: BudgetPlanHistoryEntry[];
  userRoleIds: string[];
  requestorId: string | null;
  actorUserId: string;
}): boolean {
  const next = getNextApprovalStep(params.status, params.approvalLevels, params.histories);
  if (!next) return false;
  return userIsEligibleForLevel(next, params.actorUserId, params.userRoleIds);
}
