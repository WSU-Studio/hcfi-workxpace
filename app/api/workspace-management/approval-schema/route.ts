import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { validateApprovalSchemaCode } from '@/lib/forms/approval-schema-validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const schemas = await prisma.approvalSchema.findMany({
      include: {
        department: { select: { id: true, code: true, name: true } },
        approvalLevels: {
          include: { role: { select: { id: true, roleCode: true, roleName: true } } },
          orderBy: { stepOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const departments = await prisma.department.findMany({ orderBy: { code: 'asc' } });
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

    const schema = await prisma.approvalSchema.create({
      data: {
        code: codeResult.code,
        name: body.name,
        type: body.type || 'BudgetPlan',
        period: body.period || 'Unlimited',
        departmentId: body.departmentId,
      },
    });

    const levels = body.levels || [];
    for (let i = 0; i < levels.length; i++) {
      await prisma.approvalLevel.create({
        data: {
          schemaId: schema.id,
          stepOrder: i + 1,
          levelType: levels[i].levelType || 'Reviewer',
          roleId: levels[i].roleId,
          parallelGroup: levels[i].parallelGroup ?? 0,
        },
      });
    }

    return NextResponse.json(schema);
  } catch (error) {
    // Surface the unique-constraint clash with a user-facing message instead
    // of a generic 500 so the form can show it inline.
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
