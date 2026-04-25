import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MONTH_FIELDS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;

const generateBudgetPlanCode = async () => {
  const lastPlan = await prisma.budgetPlan.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      code: true,
    },
  });

  const lastNumber = lastPlan?.code?.match(/\d+$/)?.[0];
  const nextNumber = lastNumber ? Number(lastNumber) + 1 : 1;

  return `BP-${String(nextNumber).padStart(5, '0')}`;
};

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  const cleaned = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();

  return Number(cleaned) || 0;
};

const toText = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = body.rows || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No rows to import' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const fiscalYear = toNumber(row.fiscalYear);
        const originOffice = toText(row.originOffice) || 'HQ';
        const departmentCode = toText(row.departmentCode);
        const projectCode = toText(row.projectCode);
        const subject = toText(row.subject);
        const description = toText(row.description);
        const approvalSchemaCode = toText(row.approvalSchemaCode);

        if (!fiscalYear) {
          throw new Error(`Fiscal Year is required for subject: ${subject || '-'}`);
        }

        if (!departmentCode) {
          throw new Error(`Department Code is required for subject: ${subject || '-'}`);
        }

        if (!subject) {
          throw new Error('Subject is required');
        }

        const department = await tx.department.findFirst({
          where: {
            code: departmentCode,
          },
          select: {
            id: true,
          },
        });

        if (!department) {
          throw new Error(`Department Code not found: ${departmentCode}`);
        }

        const project = projectCode
          ? await tx.project.findFirst({
              where: {
                code: projectCode,
              },
              select: {
                id: true,
              },
            })
          : null;

        if (projectCode && !project) {
          throw new Error(`Project Code not found: ${projectCode}`);
        }

        const approvalSchema = approvalSchemaCode
          ? await tx.approvalSchema.findFirst({
              where: {
                name: approvalSchemaCode,
              },
              select: {
                id: true,
              },
            })
          : null;

        if (approvalSchemaCode && !approvalSchema) {
          throw new Error(`Approval Schema Code not found: ${approvalSchemaCode}`);
        }

        const code = await generateBudgetPlanCode();

        const budgetPlan = await tx.budgetPlan.create({
          data: {
            code,
            subject,
            description,
            fiscalYear,
            originOffice,
            departmentId: department.id,
            projectId: project?.id || null,
            approvalSchemaId: approvalSchema?.id || null,
            status: 'Draft',
            requestDate: new Date(),
            supportingDocs: [],
          },
          select: {
            id: true,
          },
        });

        await tx.budgetPlanAllocation.createMany({
          data: MONTH_FIELDS.map((field, index) => ({
            budgetPlanId: budgetPlan.id,
            month: index + 1,
            allocation: toNumber(row[field]),
          })),
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Budget plans imported successfully',
      totalImported: rows.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to import budget plans',
      },
      { status: 500 }
    );
  }
}