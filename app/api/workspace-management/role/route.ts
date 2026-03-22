import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { roleCode: 'asc' },
    });
    return NextResponse.json(roles);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const existing = await prisma.role.findUnique({ where: { roleCode: body.roleCode } });
    if (existing) {
      return NextResponse.json({ error: 'Role code already exists' }, { status: 400 });
    }

    const role = await prisma.role.create({
      data: {
        roleCode: body.roleCode,
        roleName: body.roleName,
        description: body.description || null,
      },
    });

    return NextResponse.json(role);
  } catch (error) {
    console.error('Failed to create role:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
