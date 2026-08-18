import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { validateApprovalSchemaCode } from '@/lib/forms/approval-schema-validation';
import { selectableDepartmentWhere } from '@/lib/department/selectable';
import { parseSchemaDepartmentId } from '@/lib/approval-schema';
import { createApprovalLevelsForSchema } from '@/lib/approval-level-pics';

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

export async function GET() {
  try {
    const schemas = await prisma.approvalSchema.findMany({
      include: {
        department: { select: { id: true, code: true, name: true } },
        approvalLevels: {
          include: {
            role: { select: { id: true, roleCode: true, roleName: true } },
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const departments = await prisma.department.findMany({
      where: selectableDepartmentWhere(),
      orderBy: { code: 'asc' },
    });
    const roles = await prisma.role.findMany({ orderBy: { roleCode: 'asc' } });
    return NextResponse.json({ schemas, departments, roles });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const codeResult = validateApprovalSchemaCode(body.code);
    if (!codeResult.ok) {
      return NextResponse.json({ error: codeResult.error }, { status: 400 });
    }

    const parsedDepartment = parseSchemaDepartmentId(body.departmentId);
    if (!parsedDepartment.ok) {
      return NextResponse.json({ error: parsedDepartment.error }, { status: 400 });
    }
    if (parsedDepartment.departmentId) {
      const departmentError = await assertActiveDepartment(parsedDepartment.departmentId);
      if (departmentError) {
        return NextResponse.json({ error: departmentError }, { status: 400 });
      }
    }

    const schema = await prisma.approvalSchema.create({
      data: {
        code: codeResult.code,
        name: body.name,
        type: body.type || 'BudgetPlan',
        period: body.period || 'Unlimited',
        departmentId: parsedDepartment.departmentId,
      },
    });

    const levels = body.levels || [];
    const levelsResult = await createApprovalLevelsForSchema(schema.id, levels);
    if (!levelsResult.ok) {
      await prisma.approvalSchema.delete({ where: { id: schema.id } });
      return NextResponse.json({ error: levelsResult.error }, { status: 400 });
    }

    return NextResponse.json(schema);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Code already in use by another approval schema' },
        { status: 409 },
      );
    }
    console.error('Failed:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
