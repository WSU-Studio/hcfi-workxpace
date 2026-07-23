import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const divisions = await prisma.division.findMany({
      include: {
        departments: { select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } },
        _count: { select: { departments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ divisions });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch divisions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const existing = await prisma.division.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'Division code already exists' }, { status: 400 });
    }

    const division = await prisma.$transaction(async (tx) => {
      const created = await tx.division.create({
        data: { code, name, description },
      });

      if (departmentIds.length > 0) {
        await tx.department.updateMany({
          where: { id: { in: departmentIds } },
          data: { divisionId: created.id },
        });
      }

      return tx.division.findUnique({
        where: { id: created.id },
        include: {
          departments: { select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } },
          _count: { select: { departments: true } },
        },
      });
    });

    return NextResponse.json(division);
  } catch (error) {
    console.error('Failed to create division:', error);
    return NextResponse.json({ error: 'Failed to create division' }, { status: 500 });
  }
}
