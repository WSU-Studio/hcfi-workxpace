import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { loadClassificationOptions } from '@/lib/classification-options';
import { selectableDepartmentWhere } from '@/lib/department/selectable';
import { fiscalYearSelectOptions } from '@/lib/fiscal-year';

export const dynamic = 'force-dynamic';

type OriginOfficeMasterDelegate = {
  findMany: (args: {
    select: {
      code: true;
      name: true;
      address: true;
      officeType: true;
      isActive: true;
    };
    orderBy: Array<{ isActive: 'asc' | 'desc' } | { code: 'asc' | 'desc' }>;
  }) => Promise<
    Array<{
      code: string;
      name: string;
      address: string | null;
      officeType: string | null;
      isActive: boolean;
    }>
  >;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Edit forms may keep the current (possibly inactive) department visible.
    const includeDepartmentId = searchParams.get('includeDepartmentId');

    const [departments, projects, approvalSchemas] = await Promise.all([
      prisma.department.findMany({
        where: selectableDepartmentWhere([includeDepartmentId]),
        orderBy: { code: 'asc' },
      }),
      prisma.project.findMany({ orderBy: { code: 'asc' } }),
      prisma.approvalSchema.findMany({
        where: { type: 'BudgetPlan' },
        include: { department: true, approvalLevels: { include: { role: true, pics: { include: { user: { select: { id: true, name: true, employeeId: true } } } } } } },
      }),
    ]);
    const fiscalYears = fiscalYearSelectOptions();

    const originOfficeMaster = (prisma as unknown as {
      originOfficeMaster: OriginOfficeMasterDelegate;
    }).originOfficeMaster;

    const originOffices = await originOfficeMaster.findMany({
      select: {
        code: true,
        name: true,
        address: true,
        officeType: true,
        isActive: true,
      },
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
    });

    const classification = await loadClassificationOptions();

    return NextResponse.json({ fiscalYears, departments, projects, approvalSchemas, originOffices, ...classification });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
