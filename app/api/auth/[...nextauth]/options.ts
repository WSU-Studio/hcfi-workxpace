import { prisma } from '@/lib/prisma';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import AzureADProvider from 'next-auth/providers/azure-ad';
import bcrypt from 'bcryptjs';
import { MenuAccess, ActivityAccess } from '@/types/access-control';
import {
  fullMenuAccess,
  fullActivityAccess,
  mergeWithDefaultMenuAccess,
  mergeWithDefaultActivityAccess,
  defaultMenuAccess,
  defaultActivityAccess,
} from '@/lib/default-access';
import { emailFromAzureProfile, isMicrosoftEntraSsoConfigured } from '@/lib/auth/microsoft-sso';

const userAuthInclude = {
  userRoles: { include: { role: true } },
  access: true,
  department: true,
} as const;

type AppUserWithAuth = NonNullable<Awaited<ReturnType<typeof findActiveAppUserByEmail>>>;

async function findActiveAppUserByEmail(emailRaw: string) {
  return prisma.user.findFirst({
    where: {
      email: { equals: emailRaw.trim(), mode: 'insensitive' },
      isActive: true,
    },
    include: userAuthInclude,
  });
}

function buildAuthUserFromDbUser(user: AppUserWithAuth) {
  if (!user.userRoles.length) {
    throw new Error('User has no role');
  }
  const roleCode = user.userRoles[0].role.roleCode;
  const isAdmin = roleCode === 'ADMIN';

  const menuAccess = isAdmin
    ? fullMenuAccess
    : {
        ...defaultMenuAccess,
        ...((typeof user.access?.menuAccess === 'string'
          ? (JSON.parse(user.access.menuAccess as string) as MenuAccess)
          : (user.access?.menuAccess as unknown as MenuAccess)) ?? {}),
      };

  const activityAccess = isAdmin
    ? fullActivityAccess
    : {
        ...defaultActivityAccess,
        ...((typeof user.access?.activityAccess === 'string'
          ? (JSON.parse(user.access.activityAccess as string) as ActivityAccess)
          : (user.access?.activityAccess as unknown as ActivityAccess)) ?? {}),
      };

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    roleId: user.userRoles[0].role.id,
    role: user.userRoles[0].role.roleName,
    departmentId: user.departmentId,
    access: { menuAccess, activityAccess },
  };
}

function applyAuthUserToToken(
  token: Record<string, unknown>,
  auth: ReturnType<typeof buildAuthUserFromDbUser>,
) {
  token.id = auth.id;
  token.sub = auth.id;
  token.roleId = auth.roleId;
  token.role = auth.role;
  token.departmentId = auth.departmentId;
  token.access = auth.access;
  token.email = auth.email;
  token.name = auth.name;
  token.picture = auth.image;
}

const providers: AuthOptions['providers'] = [
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Missing credentials');
      }

      const user = await findActiveAppUserByEmail(credentials.email);
      if (!user) throw new Error('No user found');
      if (!user.userRoles.length) throw new Error('User has no role');

      const isValid = await bcrypt.compare(credentials.password, user.password);
      if (!isValid) throw new Error('Invalid password');

      return buildAuthUserFromDbUser(user);
    },
  }),
];

if (isMicrosoftEntraSsoConfigured()) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  );
}

export const authOptions: AuthOptions = {
  providers,
  pages: { signIn: '/login', signOut: '/login', error: '/login' },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'azure-ad') return true;
      const email = emailFromAzureProfile(profile);
      if (!email) return false;
      const user = await findActiveAppUserByEmail(email);
      return Boolean(user && user.userRoles.length > 0);
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === 'azure-ad' && profile) {
        const email = emailFromAzureProfile(profile);
        if (email) {
          const dbUser = await findActiveAppUserByEmail(email);
          if (dbUser && dbUser.userRoles.length) {
            applyAuthUserToToken(token as Record<string, unknown>, buildAuthUserFromDbUser(dbUser));
          }
        }
      } else if (user && account?.provider === 'credentials') {
        const u = user as {
          id: string;
          email: string;
          name: string;
          image: string | null;
          roleId: string;
          role: string;
          departmentId: string;
          access: { menuAccess: MenuAccess; activityAccess: ActivityAccess };
        };
        applyAuthUserToToken(token as Record<string, unknown>, {
          id: u.id,
          email: u.email,
          name: u.name,
          image: u.image,
          roleId: u.roleId,
          role: u.role,
          departmentId: u.departmentId,
          access: u.access,
        });
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
        if (typeof token.email === 'string') session.user.email = token.email;
        if (typeof token.name === 'string') session.user.name = token.name;
        if (typeof token.picture === 'string') session.user.image = token.picture;
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
    async redirect() {
      return '/dashboard';
    },
  },
  session: { strategy: 'jwt' as const, maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
