import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { validateApprovalSchemaCode } from '@/lib/forms/approval-schema-validation';
import { selectableDepartmentWhere } from '@/lib/department/selectable';
import { parseSchemaDepartmentId } from '@/lib/approval-schema';
import {
  approvalLevelPicsWithUserInclude,
  createApprovalLevelsForSchema,
  validateApprovalLevelDrafts,
} from '@/lib/approval-level-pics';

export const dynamic = 'force-dynamic';

async function assertActiveDepartment(departmentId: string, allowId?: string | null) {
  if (allowId && departmentId === allowId) return null;
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { isActive: true, code: true },
  });
  if (!department) return 'Invalid department';
  if (!department.isActive) return `Department ${department.code} is inactive and cannot be selected`;
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const schema = await prisma.approvalSchema.findUnique({
      where: { id },
      include: {
        department: true,
        approvalLevels: {
          include: {
            role: true,
            ...approvalLevelPicsWithUserInclude,
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
    if (!schema) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const departments = await prisma.department.findMany({
      where: selectableDepartmentWhere([schema.departmentId]),
      orderBy: { code: 'asc' },
    });
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

    const current = await prisma.approvalSchema.findUnique({
      where: { id },
      select: { departmentId: true },
    });
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const parsedDepartment = parseSchemaDepartmentId(body.departmentId);
    if (!parsedDepartment.ok) {
      return NextResponse.json({ error: parsedDepartment.error }, { status: 400 });
    }
    if (parsedDepartment.departmentId) {
      const departmentError = await assertActiveDepartment(
        parsedDepartment.departmentId,
        current.departmentId
      );
      if (departmentError) {
        return NextResponse.json({ error: departmentError }, { status: 400 });
      }
    }

    const levels = body.levels || [];
    const levelsValid = await validateApprovalLevelDrafts(levels);
    if (!levelsValid.ok) {
      return NextResponse.json({ error: levelsValid.error }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.approvalSchema.update({
        where: { id },
        data: {
          code: codeResult.code,
          name: body.name,
          type: body.type,
          period: body.period || 'Unlimited',
          departmentId: parsedDepartment.departmentId,
        },
      });
      await tx.approvalLevel.deleteMany({ where: { schemaId: id } });
      const levelsResult = await createApprovalLevelsForSchema(id, levels, tx);
      if (!levelsResult.ok) {
        throw new Error(levelsResult.error);
      }
    });

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
