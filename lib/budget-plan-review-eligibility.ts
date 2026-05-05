import { prisma } from '@/lib/prisma';

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

export function getNextBudgetPlanApprovalStep(
  status: string,
  levels: { stepOrder: number; roleId: string; levelType: string }[]
) {
  const ordered = [...levels].sort((a, b) => a.stepOrder - b.stepOrder);
  if (!ordered.length) return null;
  if (status === 'Draft') return ordered[0];
  if (status === 'Reviewed' && ordered.length > 1) return ordered[1];
  return null;
}

/** True if the user holds the role required for the current workflow step (Draft → step 1, Reviewed → step 2). */
export function canUserActOnCurrentBudgetPlanStep(params: {
  planStatus: string;
  approvalLevels: { stepOrder: number; roleId: string; levelType: string }[];
  userRoleIds: string[];
}): boolean {
  const next = getNextBudgetPlanApprovalStep(params.planStatus, params.approvalLevels);
  if (!next) return false;
  return params.userRoleIds.includes(next.roleId);
}

/** Next step for budget request: Draft → first level (e.g. Reviewer), Pending/Reviewed → second level (e.g. Approver). */
export function getNextBudgetRequestApprovalStep(
  status: string,
  levels: { stepOrder: number; roleId: string; levelType: string }[]
) {
  const ordered = [...levels].sort((a, b) => a.stepOrder - b.stepOrder);
  if (!ordered.length) return null;
  if (status === 'Approved') return null;
  if (status === 'Draft') return ordered[0];
  if ((status === 'Pending' || status === 'Reviewed') && ordered.length > 1) return ordered[1];
  return null;
}

export function canUserActOnCurrentBudgetRequestStep(params: {
  requestStatus: string;
  approvalLevels: { stepOrder: number; roleId: string; levelType: string }[];
  userRoleIds: string[];
  requestorId: string | null;
  actorUserId: string;
}): boolean {
  if (params.requestorId && params.requestorId === params.actorUserId) return false;
  const next = getNextBudgetRequestApprovalStep(params.requestStatus, params.approvalLevels);
  if (!next) return false;
  return params.userRoleIds.includes(next.roleId);
}
