import { parseDashboardView, type MenuAccess, type ActivityAccess } from '@/types/access-control';
import { prisma } from '@/lib/prisma';
import {
  defaultActivityAccess,
  defaultMenuAccess,
  fullActivityAccess,
  fullMenuAccess,
} from '@/lib/default-access';

/**
 * Shape of the user object that NextAuth's `jwt` callback consumes.
 *
 * Kept in one place so both the CredentialsProvider and the AzureADProvider
 * paths emit identical payloads — preventing subtle divergence in claims,
 * role resolution, or access flags between the two sign-in methods.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  roleId: string;
  role: string;
  departmentId: string;
  access: {
    menuAccess: MenuAccess;
    activityAccess: ActivityAccess;
  };
}

const ADMIN_ROLE_CODE = 'ADMIN';

type UserWithRelations = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  departmentId: string;
  userRoles: { role: { id: string; roleCode: string; roleName: string } }[];
  access: { menuAccess: unknown; activityAccess: unknown } | null;
};

function parseAccessJson<T>(raw: unknown): Partial<T> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Partial<T>;
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Partial<T>;
  }
  return {};
}

/**
 * Build the session payload from a DB user row with the relations we need.
 *
 * The admin role starts from a fully-permissive baseline; every other role
 * starts from the conservative default-deny baseline. Either way, the user's
 * stored access overrides take precedence — this lets the admin narrow a
 * specific user's powers (e.g. revoke cross-department view for one admin
 * teammate) via the Access Control UI without having to demote their role.
 *
 * Previously the admin branch returned `fullAccess` unconditionally, which
 * silently ignored any per-user overrides for admin-role users. That made
 * the cross-department gates impossible to enforce on those users.
 */
function buildSessionUser(user: UserWithRelations): SessionUser {
  const primaryRole = user.userRoles[0].role;
  const isAdmin = primaryRole.roleCode === ADMIN_ROLE_CODE;

  const baseMenuAccess = isAdmin ? fullMenuAccess : defaultMenuAccess;
  const baseActivityAccess = isAdmin ? fullActivityAccess : defaultActivityAccess;

  const menuAccess: MenuAccess = {
    ...baseMenuAccess,
    ...parseAccessJson<MenuAccess>(user.access?.menuAccess),
  };

  const activityAccess: ActivityAccess = {
    ...baseActivityAccess,
    ...parseAccessJson<ActivityAccess>(user.access?.activityAccess),
  };
  activityAccess.dashboardView = parseDashboardView(activityAccess.dashboardView);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    roleId: primaryRole.id,
    role: primaryRole.roleName,
    departmentId: user.departmentId,
    access: { menuAccess, activityAccess },
  };
}

/**
 * Load a session-ready user by email. Returns `null` when the email is not
 * registered, the account is disabled, or no role has been assigned.
 *
 * Used by the Azure AD sign-in path: SSO authenticates the user against
 * Entra ID, but authorization (role + access flags) still comes from our DB.
 */
export async function loadSessionUserByEmail(
  email: string,
): Promise<SessionUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const user = await prisma.user.findFirst({
    where: { email: normalized, isActive: true },
    include: {
      userRoles: { include: { role: true } },
      access: true,
    },
  });

  if (!user || user.userRoles.length === 0) return null;
  return buildSessionUser(user);
}

/**
 * Load a session-ready user by primary key. Useful when we already have the
 * `id` (e.g. from a previously-issued JWT) and want fresh role/access data.
 */
export async function loadSessionUserById(
  id: string,
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      userRoles: { include: { role: true } },
      access: true,
    },
  });

  if (!user || !user.isActive || user.userRoles.length === 0) return null;
  return buildSessionUser(user);
}
