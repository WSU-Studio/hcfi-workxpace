import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [division, departments] = await Promise.all([
      prisma.division.findUnique({
        where: { id },
        include: {
          departments: { select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } },
          _count: { select: { departments: true } },
        },
      }),
      prisma.department.findMany({
        select: { id: true, code: true, name: true, divisionId: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    if (!division) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 });
    }

    return NextResponse.json({ division, departments });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch division' }, { status: 500 });
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
    const code = String(body.code ?? '').trim();
    const name = String(body.name ?? '').trim();
    const description = body.description ? String(body.description).trim() : null;
    const departmentIds: string[] = Array.isArray(body.departmentIds)
      ? body.departmentIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim() !== '')
      : [];

    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
    }

    const existing = await prisma.division.findFirst({
      where: { code, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Division code already exists' }, { status: 400 });
    }

    const division = await prisma.$transaction(async (tx) => {
      await tx.division.update({
        where: { id },
        data: { code, name, description },
      });

      // Reset membership, then assign selected departments to this division.
      await tx.department.updateMany({
        where: { divisionId: id },
        data: { divisionId: null },
      });

      if (departmentIds.length > 0) {
        await tx.department.updateMany({
          where: { id: { in: departmentIds } },
          data: { divisionId: id },
        });
      }

      return tx.division.findUnique({
        where: { id },
        include: {
          departments: { select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } },
          _count: { select: { departments: true } },
        },
      });
    });

    return NextResponse.json(division);
  } catch (error) {
    console.error('Failed to update division:', error);
    return NextResponse.json({ error: 'Failed to update division' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      await tx.department.updateMany({
        where: { divisionId: id },
        data: { divisionId: null },
      });
      await tx.division.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete division:', error);
    return NextResponse.json({ error: 'Failed to delete division' }, { status: 500 });
  }
}
