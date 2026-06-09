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
     * Gate for the Azure AD path: SSO must only let in users who have already
     * been provisioned in our DB (with a role + department). Returning false
     * sends the browser to `/login?error=AccessDenied`, which the login page
     * translates into a user-facing message.
     *
     * The Credentials path bypasses this gate — its `authorize()` already
     * enforces the same invariants by throwing on missing user / role.
     */
    async signIn({ user, account }) {
      if (account?.provider !== 'azure-ad') return true;

      const email = user?.email;
      if (!email) return false;

      const dbUser = await loadSessionUserByEmail(email);
      if (!dbUser) return false;

      Object.assign(user, {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        image: dbUser.image,
        roleId: dbUser.roleId,
        role: dbUser.role,
        departmentId: dbUser.departmentId,
        access: dbUser.access,
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
