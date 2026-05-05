import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { defaultActivityAccess, defaultMenuAccess } from '@/lib/default-access';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        isActive: true,
        createdAt: true,
        roleId: true,
        departmentId: true,
        role: { select: { id: true, roleCode: true, roleName: true } },
        department: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const roles = await prisma.role.findMany({
      select: { id: true, roleCode: true, roleName: true },
      orderBy: { roleName: 'asc' },
    });

    const departments = await prisma.department.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users, roles, departments });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const employeeId = String(body.employeeId ?? '').trim();
    const password = String(body.password ?? '');
    const roleId = String(body.roleId ?? '').trim();
    const departmentId = String(body.departmentId ?? '').trim();
    const isActive = body.isActive !== false;

    if (!name || !email || !employeeId || !password || !roleId || !departmentId) {
      return NextResponse.json({ error: 'Please complete all required fields' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const [existingEmail, existingEmployee, role, department] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { employeeId } }),
      prisma.role.findUnique({ where: { id: roleId } }),
      prisma.department.findUnique({ where: { id: departmentId } }),
    ]);

    if (existingEmail) return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    if (existingEmployee) return NextResponse.json({ error: 'Employee ID already in use' }, { status: 400 });
    if (!role || !department) return NextResponse.json({ error: 'Invalid role or department' }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        employeeId,
        password: hashedPassword,
        roleId,
        departmentId,
        isActive,
        userRoles: { create: { roleId } },
        access: {
          create: {
            menuAccess: defaultMenuAccess as unknown as Prisma.InputJsonValue,
            activityAccess: defaultActivityAccess as unknown as Prisma.InputJsonValue,
          },
        },
      },
      include: {
        role: { select: { id: true, roleCode: true, roleName: true } },
        department: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
