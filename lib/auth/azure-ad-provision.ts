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
 * Verify Microsoft Entra group membership against the configured allowlist.
 *
 * The allowlist lives in env var `AZURE_ALLOWED_GROUP_IDS` as a
 * comma-separated list of Entra group Object IDs (GUIDs). The user's `groups`
 * claim (emitted when App Registration → Token Configuration → Add groups
 * claim is enabled with "Security groups, Group ID") must intersect the
 * allowlist for sign-in to proceed.
 *
 * Two modes:
 *
 *   1. UNRESTRICTED (env empty or unset) — any authenticated Entra user is
 *      allowed. Use this when access is gated solely by which tenant
 *      authenticates the user (e.g., single-tenant App Registration).
 *
 *   2. ALLOWLIST (env non-empty) — only members of at least one listed
 *      group are allowed. Use this when the tenant contains users beyond
 *      your application's audience (e.g., HCFI policy: only members of
 *      `HCFI-all-users` may sign in).
 *
 * Example values:
 *   AZURE_ALLOWED_GROUP_IDS=""                                  → unrestricted
 *   AZURE_ALLOWED_GROUP_IDS="a1b2c3d4-..."                      → single group
 *   AZURE_ALLOWED_GROUP_IDS="a1b2c3d4-..., e5f6g7h8-..."        → any of two
 *
 * Note: when the allowlist is non-empty but the token carries no `groups`
 * claim, we deny (fail-closed). This protects against accidental exposure
 * if the Entra admin forgets to enable group claims on the App Registration.
 */
export function isAuthorizedByEntraGroup(
  groupClaim: unknown,
): boolean {
  const allowlist = parseAllowedGroupIds();

  if (allowlist.length === 0) return true;

  if (!Array.isArray(groupClaim)) return false;
  return groupClaim.some((g) => typeof g === 'string' && allowlist.includes(g));
}

/**
 * Parse `AZURE_ALLOWED_GROUP_IDS` into a clean string array.
 *
 * - Splits on comma, trims whitespace, drops empty entries.
 * - Order-independent and duplicate-tolerant (no dedup needed because we
 *   only do `.includes()` on it; duplicates are functionally harmless).
 * - Returns empty array when env var is unset or contains no meaningful
 *   values — caller treats this as "unrestricted".
 */
function parseAllowedGroupIds(): string[] {
  const raw = process.env.AZURE_ALLOWED_GROUP_IDS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
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
