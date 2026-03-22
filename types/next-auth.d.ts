import 'next-auth';
import { DefaultSession } from 'next-auth';
import { MenuAccess, ActivityAccess } from './access-control';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      roleId: string;
      departmentId: string;
      access: {
        menuAccess: MenuAccess;
        activityAccess: ActivityAccess;
      };
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    roleId?: string;
    role?: string;
    departmentId?: string;
    access?: {
      menuAccess: MenuAccess;
      activityAccess: ActivityAccess;
    };
  }
}
