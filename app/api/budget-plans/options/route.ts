import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [fiscalYears, departments, projects, approvalSchemas] = await Promise.all([
      prisma.fiscalYear.findMany({ where: { isActive: true }, orderBy: { year: 'desc' } }),
      prisma.department.findMany({ orderBy: { code: 'asc' } }),
      prisma.project.findMany({ orderBy: { code: 'asc' } }),
      prisma.approvalSchema.findMany({
        where: { type: 'BudgetPlan' },
        include: { department: true, approvalLevels: { include: { role: true } } },
      }),
    ]);

    const originOffices = await prisma.originOfficeMaster.findMany({
      select: {
        code: true,
        name: true,
        address: true,
        officeType: true,
        isActive: true,
      },
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
    });

    return NextResponse.json({ fiscalYears, departments, projects, approvalSchemas, originOffices });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
