import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { isSyncManagedMaster } from '@/lib/workspace-master-ui-policy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const departments = await prisma.department.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        head: { select: { id: true, name: true } },
        division: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isSyncManagedMaster('department')) {
      return NextResponse.json(
        { error: 'Department is synced from Confins and cannot be created here' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const existing = await prisma.department.findUnique({ where: { code: body.code } });
    if (existing) {
      return NextResponse.json({ error: 'Department code already exists' }, { status: 400 });
    }

    const department = await prisma.department.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description || null,
        headId: body.headId || null,
        divisionId: body.divisionId || null,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Failed to create department:', error);
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}
