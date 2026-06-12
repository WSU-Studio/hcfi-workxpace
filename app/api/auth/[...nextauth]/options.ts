import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import {
  defaultActivityAccess,
  defaultMenuAccess,
  mergeWithDefaultActivityAccess,
  mergeWithDefaultMenuAccess,
} from '@/lib/default-access';
import { createAzureAdProvider } from '@/lib/auth/azure-ad-provider';
import {
  isAuthorizedByEntraGroup,
  provisionOrLoadAzureAdUser,
} from '@/lib/auth/azure-ad-provision';
import {
  loadSessionUserByEmail,
  type SessionUser,
} from '@/lib/auth/session-user';
import type { ActivityAccess, MenuAccess } from '@/types/access-control';

const credentialsProvider = CredentialsProvider({
  name: 'Credentials',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      throw new Error('Missing credentials');
    }

    const user = await prisma.user.findUnique({
      where: { email: credentials.email, isActive: true },
      include: {
        userRoles: { include: { role: true } },
        access: true,
        department: true,
      },
    });

    if (!user) throw new Error('No user found');
    if (!user.userRoles.length) throw new Error('User has no role');

    const isValid = await bcrypt.compare(credentials.password, user.password);
    if (!isValid) throw new Error('Invalid password');

    const sessionUser = await loadSessionUserByEmail(user.email);
    if (!sessionUser) throw new Error('User not eligible for sign-in');

    return sessionUser;
  },
});

const azureAdProvider = createAzureAdProvider();

export const authOptions: AuthOptions = {
  providers: azureAdProvider
    ? [credentialsProvider, azureAdProvider]
    : [credentialsProvider],
  pages: { signIn: '/login', signOut: '/login', error: '/login' },
  callbacks: {
    /**
     * Two-stage gate for the Azure AD (Entra ID) path:
     *
     *   1. AUTHORIZATION (group check) — when `AZURE_ALLOWED_GROUP_IDS` is
     *      non-empty, the user's `groups` claim must intersect the allowlist.
     *      When empty/unset, any authenticated Entra user is allowed. See
     *      `isAuthorizedByEntraGroup` for the full policy.
     *
     *   2. PROVISIONING (auto) — once authorized, the user is upserted into
     *      the DB with placeholder GUEST role / UNASSIGNED department and
     *      `isActive=true` but ZERO menu/activity access. Admin must
     *      explicitly grant access via User Management afterwards.
     *
     * The Credentials path bypasses both gates — its `authorize()` enforces
     * the existing email+password invariants directly.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'azure-ad') return true;

      const debug = process.env.SSO_DEBUG === 'true';

      const email = user?.email ?? (profile as { email?: string } | undefined)?.email;
      if (!email) {
        if (debug) {
          console.warn('[SSO] reject: no email in profile', {
            profileKeys: profile ? Object.keys(profile) : null,
          });
        }
        return false;
      }

      const groupClaim = (profile as { groups?: unknown } | undefined)?.groups;
      const allowed = isAuthorizedByEntraGroup(groupClaim);

      if (debug) {
        const claimSources = (profile as { _claim_sources?: unknown } | undefined)
          ?._claim_sources;
        console.log('[SSO] group check', {
          email,
          groupsClaimPresent: Array.isArray(groupClaim),
          groupsCount: Array.isArray(groupClaim) ? groupClaim.length : null,
          groupsSample: Array.isArray(groupClaim) ? groupClaim.slice(0, 5) : null,
          hasClaimSources: Boolean(claimSources),
          allowlistConfigured: Boolean(process.env.AZURE_ALLOWED_GROUP_IDS),
          allowlistCount: (process.env.AZURE_ALLOWED_GROUP_IDS ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean).length,
          authorized: allowed,
        });
      }

      if (!allowed) return false;

      const entraOid =
        (profile as { oid?: string; sub?: string } | undefined)?.oid ??
        (profile as { sub?: string } | undefined)?.sub ??
        null;

      const sessionUser = await provisionOrLoadAzureAdUser({
        email,
        name: user?.name ?? (profile as { name?: string } | undefined)?.name ?? null,
        oid: entraOid,
      });
      if (!sessionUser) return false;

      Object.assign(user, {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        image: sessionUser.image,
        roleId: sessionUser.roleId,
        role: sessionUser.role,
        departmentId: sessionUser.departmentId,
        access: sessionUser.access,
      });

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as SessionUser;
        token.id = u.id;
        token.sub = u.id;
        token.roleId = u.roleId;
        token.role = u.role;
        token.departmentId = u.departmentId;
        token.access = u.access;
      }
      const raw = token.access as
        | { menuAccess?: MenuAccess; activityAccess?: ActivityAccess }
        | undefined;
      if (raw) {
        token.access = {
          menuAccess: mergeWithDefaultMenuAccess(raw.menuAccess),
          activityAccess: mergeWithDefaultActivityAccess(raw.activityAccess),
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = (token.id as string | undefined) ?? token.sub ?? '';
        session.user.roleId = token.roleId as string;
        session.user.departmentId = token.departmentId as string;
        session.user.role = token.role ?? '';
        const access = (token.access ?? {
          menuAccess: defaultMenuAccess,
          activityAccess: defaultActivityAccess,
        }) as { menuAccess: Partial<MenuAccess>; activityAccess: Partial<ActivityAccess> };
        session.user.access = {
          menuAccess: { ...defaultMenuAccess, ...(access.menuAccess ?? {}) },
          activityAccess: { ...defaultActivityAccess, ...(access.activityAccess ?? {}) },
        };
      }
      return session;
    },
    /**
     * Force every post-sign-in landing to `/dashboard`.
     *
     * Must return an ABSOLUTE URL — NextAuth (and the browser's URL
     * constructor it uses for validation) rejects bare paths like
     * `/dashboard` with `TypeError: URL constructor: ... is not a valid URL`.
     * Use the `baseUrl` argument (derived from NEXTAUTH_URL) so this
     * resolves correctly across local, preview, and production deployments.
     */
    async redirect({ baseUrl }) {
      return `${baseUrl}/dashboard`;
    },
  },
  session: { strategy: 'jwt' as const, maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
