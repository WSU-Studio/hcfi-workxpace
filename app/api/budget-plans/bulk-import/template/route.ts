import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import { schemaAppliesToDepartment } from '@/lib/approval-schema';
import {
  buildBudgetPlanImportWorkbookBuffer,
  defaultBudgetPlanImportSample,
  type BudgetPlanImportSample,
} from '@/lib/budget-plans/bulk-import-template';
import { getCurrentFiscalYear } from '@/lib/fiscal-year';

export const dynamic = 'force-dynamic';

/**
 * Downloadable bulk-import workbook whose sample row uses codes that actually
 * exist in this environment (origin office, department, project, schema).
 * Static `public/templates/...xlsx` drifted (SG / A1) and testers hit lookup
 * failures or assumed dummy codes were valid.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fallback = defaultBudgetPlanImportSample();
    const userDepartmentId = session.user.departmentId ?? '';

    const [originOffices, departments, projects, approvalSchemas] = await Promise.all([
      prisma.originOfficeMaster.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
        select: { code: true },
      }),
      prisma.department.findMany({
        orderBy: { code: 'asc' },
        select: { id: true, code: true },
      }),
      prisma.project.findMany({
        orderBy: { code: 'asc' },
        select: { code: true },
      }),
      prisma.approvalSchema.findMany({
        where: { type: 'BudgetPlan' },
        orderBy: { code: 'asc' },
        select: { code: true, departmentId: true },
      }),
    ]);

    const department =
      departments.find((row) => row.id === userDepartmentId) ?? departments[0] ?? null;

    const matchingSchemas = department
      ? approvalSchemas.filter((schema) =>
          schemaAppliesToDepartment(schema.departmentId, department.id),
        )
      : [];
    const preferredSchema =
      matchingSchemas.find((schema) => schema.code.toUpperCase() === 'BP-PRIMARY') ??
      matchingSchemas[0] ??
      null;

    const originOffice =
      originOffices.find((row) => row.code === '99') ?? originOffices[0] ?? null;

    const sample: BudgetPlanImportSample = {
      fiscalYear: getCurrentFiscalYear(),
      originOffice: originOffice?.code || fallback.originOffice,
      departmentCode: department?.code || fallback.departmentCode,
      projectCode: projects[0]?.code || fallback.projectCode,
      approvalSchemaCode: preferredSchema?.code || fallback.approvalSchemaCode,
    };

    const buffer = buildBudgetPlanImportWorkbookBuffer(sample);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Bulk_Import_Budget_Plan.xlsx"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[GET /api/budget-plans/bulk-import/template]', error);
    return NextResponse.json({ error: 'Failed to build import template' }, { status: 500 });
  }
}
