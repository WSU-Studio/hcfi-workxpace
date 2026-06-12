import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import {
  defaultActivityAccess,
  restrictedMenuAccess,
} from '@/lib/default-access';
import {
  loadSessionUserByEmail,
  type SessionUser,
} from '@/lib/auth/session-user';

/**
 * Codes used for the placeholder role / department that auto-provisioned
 * SSO users start with. Kept here as constants — single source of truth so
 * any future rename only touches one file.
 *
 * `GUEST` role + `UNASSIGNED` department + restrictedMenuAccess (everything
 * false) together implement the Hyundai requirement:
 *   "user yang aktif tidak memiliki hak akses apa-apa,
 *    dia harus kontak administrator untuk diassign hak aksesnya nanti"
 */
const GUEST_ROLE_CODE = 'GUEST';
const UNASSIGNED_DEPARTMENT_CODE = 'UNASSIGNED';

const GUEST_ROLE_DEFAULTS = {
  roleCode: GUEST_ROLE_CODE,
  roleName: 'Guest',
  description:
    'Auto-provisioned via SSO. No access by default — admin must assign role/access.',
};

const UNASSIGNED_DEPARTMENT_DEFAULTS = {
  code: UNASSIGNED_DEPARTMENT_CODE,
  name: 'Unassigned',
  description:
    'Placeholder department for SSO-provisioned users. Admin must reassign.',
};

/**
 * Verify Microsoft Entra group membership.
 *
 * Hyundai policy: only members of the `HCFI-all-users` security group are
 * allowed to sign in. The group's Object ID lives in env (so we can swap
 * tenants/groups without code changes), and is matched against the `groups`
 * claim that Entra emits when the App Registration has groups configured
 * under Token Configuration → Add groups claim.
 *
 * Returns `true` when env is configured AND user is in the allowed group;
 * returns `false` in any other case. When the env var is unset we fail
 * closed (reject all SSO) to avoid accidentally exposing the app while
 * waiting for the group ID from the Entra admin.
 */
export function isAuthorizedByEntraGroup(
  groupClaim: unknown,
): boolean {
  const requiredGroupId = process.env.AZURE_ALL_USERS_GROUP_ID;
  if (!requiredGroupId) return false;

  if (!Array.isArray(groupClaim)) return false;
  return groupClaim.includes(requiredGroupId);
}

/**
 * Ensure the placeholder GUEST role exists, creating it on first run.
 *
 * Idempotent (upsert) so concurrent first-time logins won't race. Lives in
 * the provisioning path rather than a one-off seed so production deployments
 * don't need a separate migration step to make SSO functional.
 */
async function ensureGuestRoleId(): Promise<string> {
  const role = await prisma.role.upsert({
    where: { roleCode: GUEST_ROLE_CODE },
    update: {},
    create: GUEST_ROLE_DEFAULTS,
  });
  return role.id;
}

async function ensureUnassignedDepartmentId(): Promise<string> {
  const department = await prisma.department.upsert({
    where: { code: UNASSIGNED_DEPARTMENT_CODE },
    update: {},
    create: UNASSIGNED_DEPARTMENT_DEFAULTS,
  });
  return department.id;
}

/**
 * Generate a cryptographically random password placeholder.
 *
 * SSO users never authenticate with this password — but the User schema
 * keeps `password` NOT NULL to preserve the credentials path's invariants.
 * Random bytes here make it impossible for an SSO-only account to be
 * password-guessed back into a credentials login.
 */
async function generatePlaceholderPasswordHash(): Promise<string> {
  const random = randomBytes(48).toString('base64url');
  return bcrypt.hash(random, 10);
}

interface ProvisionInput {
  email: string;
  name: string | null | undefined;
  /** Entra Object ID (oid) — stable, unique per user in the tenant. */
  oid: string | null | undefined;
}

/**
 * Find or create a user record for an Entra SSO sign-in.
 *
 * Flow:
 *   1. Look up by email. If found → return existing session payload
 *      (admin may have changed role/access since first provision).
 *   2. Otherwise auto-provision with placeholder role/department, empty
 *      access flags, active=true, and a random unguessable password.
 *
 * Returns `null` only if we cannot resolve the new user back into a session
 * payload — should not happen in practice but guarded for safety.
 */
export async function provisionOrLoadAzureAdUser(
  input: ProvisionInput,
): Promise<SessionUser | null> {
  const email = input.email.trim().toLowerCase();
  if (!email) return null;

  const existing = await loadSessionUserByEmail(email);
  if (existing) return existing;

  const [guestRoleId, unassignedDeptId, passwordHash] = await Promise.all([
    ensureGuestRoleId(),
    ensureUnassignedDepartmentId(),
    generatePlaceholderPasswordHash(),
  ]);

  const employeeId = buildEmployeeId(input.oid, email);

  await prisma.user.create({
    data: {
      email,
      name: input.name?.trim() || email,
      password: passwordHash,
      employeeId,
      roleId: guestRoleId,
      departmentId: unassignedDeptId,
      isActive: true,
      userRoles: {
        create: { roleId: guestRoleId },
      },
      access: {
        create: {
          menuAccess: restrictedMenuAccess as unknown as object,
          activityAccess: defaultActivityAccess as unknown as object,
        },
      },
    },
  });

  return loadSessionUserByEmail(email);
}

/**
 * Build a unique employeeId for an SSO-provisioned user.
 *
 * Preference order:
 *   1. Entra `oid` (Object ID) — stable, unique per user in tenant. Prefix
 *      with `SSO-` so it's visually distinguishable from manually-assigned
 *      employee IDs (which use EMPxxx pattern in the seed data).
 *   2. Email hash fallback — only when `oid` is missing (shouldn't happen
 *      with a properly-configured Entra app, but guarded for safety).
 *
 * Note: `employeeId` is UNIQUE in the schema. Using `oid` (immutable per
 * user) guarantees no collision across re-provisioning attempts.
 */
function buildEmployeeId(
  oid: string | null | undefined,
  email: string,
): string {
  if (oid) return `SSO-${oid}`;
  return `SSO-${Buffer.from(email).toString('base64url').slice(0, 24)}`;
}

/** Re-exported so other modules don't need to import constants separately. */
export { GUEST_ROLE_CODE, UNASSIGNED_DEPARTMENT_CODE };
