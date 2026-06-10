import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { validateApprovalSchemaCode } from '@/lib/forms/approval-schema-validation';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const schema = await prisma.approvalSchema.findUnique({
      where: { id },
      include: {
        department: true,
        approvalLevels: {
          include: { role: true },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
    if (!schema) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const departments = await prisma.department.findMany({ orderBy: { code: 'asc' } });
    const roles = await prisma.role.findMany({ orderBy: { roleCode: 'asc' } });
    return NextResponse.json({ schema, departments, roles });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const codeResult = validateApprovalSchemaCode(body.code);
    if (!codeResult.ok) {
      return NextResponse.json({ error: codeResult.error }, { status: 400 });
    }

    await prisma.approvalSchema.update({
      where: { id },
      data: {
        code: codeResult.code,
        name: body.name,
        type: body.type,
        period: body.period || 'Unlimited',
        departmentId: body.departmentId,
      },
    });

    await prisma.approvalLevel.deleteMany({ where: { schemaId: id } });
    const levels = body.levels || [];
    for (let i = 0; i < levels.length; i++) {
      await prisma.approvalLevel.create({
        data: {
          schemaId: id,
          stepOrder: i + 1,
          levelType: levels[i].levelType || 'Reviewer',
          roleId: levels[i].roleId,
          parallelGroup: levels[i].parallelGroup ?? 0,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json(
        { error: 'Code already in use by another approval schema' },
        { status: 409 },
      );
    }
    console.error('Failed:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.approvalLevel.deleteMany({ where: { schemaId: id } });
    await prisma.approvalSchema.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
