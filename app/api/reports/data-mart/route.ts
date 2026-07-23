import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import {
  loadClassificationLabelMaps,
  resolveClassificationLabel,
} from '@/lib/data-mart/resolve-classification-labels';
import type { MenuAccess } from '@/types/access-control';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const menuAccess = session.user.access?.menuAccess as MenuAccess | undefined;
    if (!menuAccess?.reports) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fy = searchParams.get('fiscalYear');
    const mo = searchParams.get('month');
    const departmentId = searchParams.get('departmentId') ?? '';
    const vendorName = searchParams.get('vendorName') ?? '';
    const categoryId = searchParams.get('categoryId') ?? '';
    const categoryKeyIndexId = searchParams.get('categoryKeyIndexId') ?? '';
    const originOfficeId = searchParams.get('originOfficeId') ?? '';
    const projectId = searchParams.get('projectId') ?? '';
    /** Legacy substring filters (optional). Prefer master IDs when available. */
    const originOfficeContains = searchParams.get('originOffice') ?? '';
    const expenseCategoryContains = searchParams.get('expenseCategory') ?? '';
    const categoryKeyIndexContains = searchParams.get('categoryKeyIndex') ?? '';
    const projectCodeContains = searchParams.get('projectCode') ?? '';

    const limitRaw = searchParams.get('limit');
    const offsetRaw = searchParams.get('offset');
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, limitRaw ? parseInt(limitRaw, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT)
    );
    const offset = Math.max(0, offsetRaw ? parseInt(offsetRaw, 10) || 0 : 0);

    const where: Prisma.DataMartStagingRowWhereInput = {};
    if (fy != null && fy !== '') {
      const n = parseInt(fy, 10);
      if (!Number.isNaN(n)) where.fiscalYear = n;
    }
    if (mo != null && mo !== '') {
      const n = parseInt(mo, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 12) where.month = n;
    }
    if (departmentId) where.departmentId = departmentId;
    if (vendorName) where.vendorName = { contains: vendorName, mode: 'insensitive' };

    if (categoryId) {
      const cat = await prisma.categoryMaster.findUnique({ where: { id: categoryId } });
      if (cat) {
        // Legacy staging rows store the master ID instead of the name — match both.
        where.expenseCategory = { in: [cat.name, cat.id], mode: 'insensitive' };
      }
    } else if (expenseCategoryContains) {
      where.expenseCategory = { contains: expenseCategoryContains, mode: 'insensitive' };
    }

    if (categoryKeyIndexId) {
      const cki = await prisma.categoryKeyIndexMaster.findUnique({ where: { id: categoryKeyIndexId } });
      if (cki) {
        // Legacy staging rows store the master ID instead of the name — match both.
        where.categoryKeyIndex = { in: [cki.name, cki.id], mode: 'insensitive' };
      }
    } else if (categoryKeyIndexContains) {
      where.categoryKeyIndex = { contains: categoryKeyIndexContains, mode: 'insensitive' };
    }

    if (originOfficeId) {
      const oo = await prisma.originOfficeMaster.findUnique({ where: { id: originOfficeId } });
      if (oo) {
        where.OR = [
          { originOffice: { equals: oo.name, mode: 'insensitive' } },
          { originOffice: { equals: oo.code, mode: 'insensitive' } },
        ];
      }
    } else if (originOfficeContains) {
      where.originOffice = { contains: originOfficeContains, mode: 'insensitive' };
    }

    if (projectId) {
      const proj = await prisma.project.findUnique({ where: { id: projectId } });
      if (proj) {
        where.projectCode = { equals: proj.code, mode: 'insensitive' };
      }
    } else if (projectCodeContains) {
      where.projectCode = { contains: projectCodeContains, mode: 'insensitive' };
    }

    const [total, rows] = await prisma.$transaction([
      prisma.dataMartStagingRow.count({ where }),
      prisma.dataMartStagingRow.findMany({
        where,
        orderBy: [{ fiscalYear: 'desc' }, { month: 'desc' }, { savedAt: 'desc' }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          confinsPaymentDocId: true,
          dataInterfaceSource: true,
          budgetRequestId: true,
          budgetRequestCode: true,
          budgetPlanCode: true,
          budgetRequestSubject: true,
          expenseCategory: true,
          expenseTypeFp: true,
          categoryKeyIndex: true,
          costCenter: true,
          accountNumberCoa: true,
          opexType: true,
          opexAllocation: true,
          budgetRequestType: true,
          projectCode: true,
          projectName: true,
          fiscalYear: true,
          month: true,
          period: true,
          quarter: true,
          originOffice: true,
          divisionName: true,
          departmentId: true,
          departmentName: true,
          requestorName: true,
          incomingReferenceId: true,
          voucherNumber: true,
          paymentDescription: true,
          paymentSource: true,
          glAccountCode: true,
          glAccountName: true,
          paidAmount: true,
          expectedAmount: true,
          currencyCode: true,
          businessRole: true,
          activityCode: true,
          subActivityCode: true,
          activityLabel: true,
          subActivityLabel: true,
          vendorName: true,
          interfaceId: true,
          paymentRequestNo: true,
          journalNo: true,
          voucherEgl: true,
          invoiceNo: true,
          invoiceDate: true,
          paymentRequestDate: true,
          requestedByEmail: true,
          budgetRequestApprovedAt: true,
          planAmount: true,
          costDriverMetric: true,
          costPerUnit: true,
          matchType: true,
          savedAt: true,
          confinsPayloadRaw: true,
          budgetRequestSnapshot: true,
        },
      }),
    ]);

    // Legacy rows persisted classification fields as master IDs; resolve to
    // display names at read time (production data stays untouched).
    const labelMaps = await loadClassificationLabelMaps();

    // Division is Workxpace-only. Fill blanks from Department → Division master.
    const budgetRequestIds = [...new Set(rows.filter((r) => !r.divisionName).map((r) => r.budgetRequestId))];
    const brDepartmentByBudgetRequestId = new Map<string, string>();
    if (budgetRequestIds.length > 0) {
      const budgetRequests = await prisma.budgetRequest.findMany({
        where: { id: { in: budgetRequestIds } },
        select: { id: true, departmentId: true },
      });
      for (const br of budgetRequests) {
        brDepartmentByBudgetRequestId.set(br.id, br.departmentId);
      }
    }

    const departmentIdsNeedingDivision = new Set<string>();
    for (const r of rows) {
      if (r.divisionName) continue;
      if (r.departmentId) departmentIdsNeedingDivision.add(r.departmentId);
      const brDepartmentId = brDepartmentByBudgetRequestId.get(r.budgetRequestId);
      if (brDepartmentId) departmentIdsNeedingDivision.add(brDepartmentId);
    }

    const divisionNameByDepartmentId = new Map<string, string>();
    if (departmentIdsNeedingDivision.size > 0) {
      const departments = await prisma.department.findMany({
        where: { id: { in: [...departmentIdsNeedingDivision] } },
        select: { id: true, division: { select: { name: true } } },
      });
      for (const dept of departments) {
        if (dept.division?.name) {
          divisionNameByDepartmentId.set(dept.id, dept.division.name);
        }
      }
    }

    const serialized = rows.map((r) => {
      const brDepartmentId = brDepartmentByBudgetRequestId.get(r.budgetRequestId);
      return {
        ...r,
        expenseCategory: resolveClassificationLabel(labelMaps.categoryById, r.expenseCategory),
        categoryKeyIndex: resolveClassificationLabel(labelMaps.categoryKeyIndexById, r.categoryKeyIndex),
        costCenter: resolveClassificationLabel(labelMaps.costCenterById, r.costCenter),
        opexAllocation: resolveClassificationLabel(labelMaps.opexAllocationById, r.opexAllocation),
        divisionName:
          r.divisionName ??
          (r.departmentId ? divisionNameByDepartmentId.get(r.departmentId) : undefined) ??
          (brDepartmentId ? divisionNameByDepartmentId.get(brDepartmentId) : undefined) ??
          null,
        paidAmount: r.paidAmount.toString(),
        expectedAmount: r.expectedAmount.toString(),
        planAmount: r.planAmount?.toString() ?? null,
        costDriverMetric: r.costDriverMetric?.toString() ?? null,
        costPerUnit: r.costPerUnit?.toString() ?? null,
        invoiceDate: r.invoiceDate?.toISOString() ?? null,
        paymentRequestDate: r.paymentRequestDate?.toISOString() ?? null,
        budgetRequestApprovedAt: r.budgetRequestApprovedAt?.toISOString() ?? null,
        savedAt: r.savedAt.toISOString(),
      };
    });

    return NextResponse.json({ rows: serialized, total, limit, offset });
  } catch (e) {
    console.error('data mart staging:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
