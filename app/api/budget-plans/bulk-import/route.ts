import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import { schemaAppliesToDepartment } from '@/lib/approval-schema';
import { createBudgetPlanCodeAllocator } from '@/lib/budget-plans/code';
import { assertFiscalYearWritable } from '@/lib/fiscal-year';
import { isPrismaUniqueViolation, publicErrorMessage } from '@/lib/prisma-errors';
import {
  approvalSchemaSnapshotInclude,
  snapshotFromLoadedSchema,
} from '@/lib/approval-schema-snapshot';

/** Bulk import can run longer than default serverless limits on large XLSX. */
export const maxDuration = 120;

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Bulk import expects rows already parsed from an XLSX file by the client.
    // The actual file-format check (extension/MIME/magic bytes) lives in
    // `lib/xlsx-validation.ts` on the client. Reject anything that is not JSON
    // here as a defence-in-depth measure.
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid Content-Type. Expected application/json from XLSX-parsed rows.' },
        { status: 415 }
      );
    }

    let body: { rows?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }
    const rows = (body?.rows ?? []) as Record<string, unknown>[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No rows to import' },
        { status: 400 }
      );
    }

    const requestor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!requestor) {
      return NextResponse.json(
        { error: 'Session expired. Please sign in again.' },
        { status: 401 }
      );
    }

    const departmentCodes = [
      ...new Set(
        rows
          .map((r: Record<string, unknown>) => toText(r.departmentCode).toUpperCase())
          .filter(Boolean)
      ),
    ];
    const projectCodes = [
      ...new Set(
        rows
          .map((r: Record<string, unknown>) => toText(r.projectCode))
          .filter(Boolean)
      ),
    ];
    // The XLSX template column is "Approval Schema Code". Normalize to upper
    // case to match what the API stores (validateApprovalSchemaCode uppercases
    // on save), so admins typing `bp-primary` in Excel still match `BP-PRIMARY`
    // in the DB.
    const approvalSchemaCodes = [
      ...new Set(
        rows
          .map((r: Record<string, unknown>) => toText(r.approvalSchemaCode).toUpperCase())
          .filter(Boolean)
      ),
    ];

    const [departments, projects, approvalSchemas] = await Promise.all([
      prisma.department.findMany({
        where: { code: { in: departmentCodes } },
        select: { id: true, code: true },
      }),
      projectCodes.length
        ? prisma.project.findMany({
            where: { code: { in: projectCodes } },
            select: { id: true, code: true },
          })
        : Promise.resolve([]),
      // Lookup by `code` first; if any rows still ship the schema's `name`
      // (legacy templates from before code was introduced), they're matched
      // by name as a fallback. New imports should always use the code.
      approvalSchemaCodes.length
        ? prisma.approvalSchema.findMany({
            where: {
              OR: [
                { code: { in: approvalSchemaCodes } },
                { name: { in: approvalSchemaCodes } },
              ],
            },
            include: approvalSchemaSnapshotInclude,
          })
        : Promise.resolve([]),
    ]);

    const departmentByCode = new Map(
      departments.map((d) => [d.code.toUpperCase(), d] as const)
    );
    const projectByCode = new Map(projects.map((p) => [p.code, p] as const));
    // Two lookup maps so the per-row code resolution can prefer the code
    // (canonical) and only fall back to name if no code matched.
    const approvalSchemaByCode = new Map(
      approvalSchemas.map((s) => [s.code, s] as const)
    );
    const approvalSchemaByName = new Map(
      approvalSchemas.map((s) => [s.name, s] as const)
    );

    await prisma.$transaction(
      async (tx) => {
        const allocateCode = createBudgetPlanCodeAllocator(tx);

        for (const row of rows) {
          const fiscalYear = toNumber(row.fiscalYear);
          const originOffice = toText(row.originOffice) || 'HQ';
          const departmentCode = toText(row.departmentCode).toUpperCase();
          const projectCode = toText(row.projectCode);
          const subject = toText(row.subject);
          const description = toText(row.description);
          const approvalSchemaCode = toText(row.approvalSchemaCode);

          if (!fiscalYear) {
            throw new Error(`Fiscal Year is required for subject: ${subject || '-'}`);
          }

          const fiscalYearVerdict = assertFiscalYearWritable(fiscalYear);
          if (!fiscalYearVerdict.ok) {
            throw new Error(`${fiscalYearVerdict.error} for subject: ${subject || '-'}`);
          }

          if (!departmentCode) {
            throw new Error(`Department Code is required for subject: ${subject || '-'}`);
          }

          if (!subject) {
            throw new Error('Subject is required');
          }

          if (!approvalSchemaCode) {
            throw new Error(`Approval Schema Code is required for subject: ${subject || '-'}`);
          }

          const department = departmentByCode.get(departmentCode);
          if (!department) {
            throw new Error(`Department Code not found: ${departmentCode}`);
          }

          const project = projectCode ? projectByCode.get(projectCode) ?? null : null;
          if (projectCode && !project) {
            throw new Error(`Project Code not found: ${projectCode}`);
          }

          // Prefer code (canonical), then fall back to name for legacy
          // templates that still ship the schema name in the Code column.
          const normalizedSchemaKey = approvalSchemaCode.toUpperCase();
          const approvalSchema =
            approvalSchemaByCode.get(normalizedSchemaKey) ??
            approvalSchemaByName.get(approvalSchemaCode) ??
            null;
          if (!approvalSchema) {
            throw new Error(`Approval Schema Code not found: ${approvalSchemaCode}`);
          }
          if (!schemaAppliesToDepartment(approvalSchema.departmentId, department.id)) {
            throw new Error(
              `Approval Schema Code ${approvalSchemaCode} cannot be used for department ${departmentCode}`,
            );
          }

          let code = await allocateCode.next(department.code);
          let budgetPlan: { id: string } | null = null;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
              budgetPlan = await tx.budgetPlan.create({
                data: {
                  code,
                  subject,
                  description,
                  fiscalYear: fiscalYearVerdict.year,
                  originOffice,
                  departmentId: department.id,
                  projectId: project?.id || null,
                  approvalSchemaId: approvalSchema.id,
                  approvalSchemaSnapshot: snapshotFromLoadedSchema(approvalSchema),
                  requestorId: session.user.id,
                  importedViaBulk: true,
                  status: 'Draft',
                  requestDate: new Date(),
                  supportingDocs: [],
                },
                select: {
                  id: true,
                },
              });
              break;
            } catch (error) {
              if (!isPrismaUniqueViolation(error, 'code') || attempt === 2) {
                throw error;
              }
              code = await allocateCode.recover(department.code);
            }
          }
          if (!budgetPlan) {
            throw new Error(`Failed to create budget plan for subject: ${subject}`);
          }

          await tx.budgetPlanAllocation.createMany({
            data: MONTH_FIELDS.map((field, index) => ({
              budgetPlanId: budgetPlan.id,
              month: index + 1,
              allocation: toNumber(row[field]),
            })),
          });
        }
      },
      {
        maxWait: 20_000,
        timeout: 90_000,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Budget plans imported successfully',
      totalImported: rows.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: publicErrorMessage(error, 'Failed to import budget plans'),
      },
      { status: 500 },
    );
  }
}
