import { ActivityAccess, MenuAccess } from '@/types/access-control';

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  isActive: boolean;
  createdAt: string;
  roleId: string;
  departmentId: string;
  role: {
    id: string;
    roleCode: string;
    roleName: string;
  } | null;
  department: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface UserFormData {
  name: string;
  email: string;
  employeeId: string;
  password: string;
  roleId: string;
  departmentId: string;
  isActive: boolean;
}

export interface UserAccessPayload {
  menuAccess: MenuAccess;
  activityAccess: ActivityAccess;
}
