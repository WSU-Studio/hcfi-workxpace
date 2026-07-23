import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
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
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const employeeId = String(body.employeeId ?? '').trim();
    const password = String(body.password ?? '');
    const roleId = String(body.roleId ?? '').trim();
    const departmentId = String(body.departmentId ?? '').trim();
    const isActive = Boolean(body.isActive);

    if (!name || !email || !employeeId || !roleId || !departmentId) {
      return NextResponse.json({ error: 'Please complete all required fields' }, { status: 400 });
    }
    if (password && password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [emailTaken, employeeTaken, role, department] = await Promise.all([
      prisma.user.findFirst({ where: { email, NOT: { id } } }),
      prisma.user.findFirst({ where: { employeeId, NOT: { id } } }),
      prisma.role.findUnique({ where: { id: roleId } }),
      prisma.department.findUnique({ where: { id: departmentId } }),
    ]);

    if (emailTaken) return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    if (employeeTaken) return NextResponse.json({ error: 'Employee ID already in use' }, { status: 400 });
    if (!role || !department) return NextResponse.json({ error: 'Invalid role or department' }, { status: 400 });
    if (!department.isActive && departmentId !== existing.departmentId) {
      return NextResponse.json(
        { error: `Department ${department.code} is inactive and cannot be selected` },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name,
          email,
          employeeId,
          roleId,
          departmentId,
          isActive,
          ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
        },
      });

      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.create({ data: { userId: id, roleId } });
    });

    const user = await prisma.user.findUnique({
      where: { id },
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
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (session.user.id === id) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
