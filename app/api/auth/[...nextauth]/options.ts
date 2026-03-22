import { prisma } from '@/lib/prisma';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { MenuAccess, ActivityAccess } from '@/types/access-control';
import { defaultMenuAccess, defaultActivityAccess } from '@/lib/default-access';

export const authOptions: AuthOptions = {
  providers: [
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

        const menuAccess = (typeof user.access?.menuAccess === 'string'
          ? JSON.parse(user.access.menuAccess as string) as MenuAccess
          : (user.access?.menuAccess as unknown as MenuAccess)) ?? defaultMenuAccess;

        const activityAccess = (typeof user.access?.activityAccess === 'string'
          ? JSON.parse(user.access.activityAccess as string) as ActivityAccess
          : (user.access?.activityAccess as unknown as ActivityAccess)) ?? defaultActivityAccess;

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
      },
    }),
  ],
  pages: { signIn: '/login', signOut: '/login', error: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; roleId: string; role: string; departmentId: string; access: { menuAccess: MenuAccess; activityAccess: ActivityAccess } };
        token.id = u.id;
        token.roleId = u.roleId;
        token.role = u.role;
        token.departmentId = u.departmentId;
        token.access = u.access;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub!;
        session.user.roleId = token.roleId as string;
        session.user.departmentId = token.departmentId as string;
        session.user.role = token.role ?? '';
        session.user.access = (token.access ?? {
          menuAccess: defaultMenuAccess,
          activityAccess: defaultActivityAccess,
        }) as { menuAccess: MenuAccess; activityAccess: ActivityAccess };
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
