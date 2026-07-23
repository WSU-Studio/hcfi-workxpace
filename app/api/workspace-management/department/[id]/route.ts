import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { areConfinsIdentityFieldsLocked, isSyncManagedMaster } from '@/lib/workspace-master-ui-policy';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        head: { select: { id: true, name: true } },
        division: { select: { id: true, code: true, name: true } },
      },
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    const [users, divisions] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.division.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      }),
    ]);
    return NextResponse.json({
      department,
      users,
      divisions,
      identityFieldsLocked: areConfinsIdentityFieldsLocked('department'),
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch department' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const lockIdentity = areConfinsIdentityFieldsLocked('department');

    const current = await prisma.department.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const nextCode = lockIdentity ? current.code : String(body.code ?? '').trim();
    const nextName = lockIdentity ? current.name : String(body.name ?? '').trim();

    if (!nextCode || !nextName) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
    }

    if (!lockIdentity) {
      const duplicate = await prisma.department.findFirst({
        where: { code: nextCode, NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json({ error: 'Department code already exists' }, { status: 400 });
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(lockIdentity ? {} : { code: nextCode, name: nextName }),
        description: body.description || null,
        headId: body.headId || null,
        divisionId: body.divisionId || null,
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Failed to update department:', error);
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isSyncManagedMaster('department')) {
      return NextResponse.json(
        { error: 'Department is synced from Confins and cannot be deleted here' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete department:', error);
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  }
}
