import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { normalizeBudgetRequestBody, toNumber } from '@/lib/budget-request-normalize';
import { normalizeOptionalString } from '@/lib/budget-requests/display';
import {
  canUserActOnCurrentStep,
  getBudgetPlanUserRoleIds,
} from '@/lib/budget-plan-review-eligibility';
import type { BudgetPlanHistoryEntry } from '@/lib/budget-plan-approval-display';
import { createBudgetRequestNotifications } from '@/lib/budget-request-notifications';
import { assertCanActOnDepartment, buildDepartmentScope } from '@/lib/access/cross-department';
import { ALL_FISCAL_YEARS, parseFiscalYearParam } from '@/lib/fiscal-year';
import { supportingDocsForPersistence } from '@/lib/supporting-docs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRoleIds = session?.user?.id ? await getBudgetPlanUserRoleIds(session.user.id) : [];
    const { searchParams } = new URL(request.url);

    // Cross-department view scope (null = unrestricted, see helper).
    const departmentScope = buildDepartmentScope(session);
    // Optional fiscal-year scope (driven by the FY filter dropdown).
    const fiscalYearFilter = parseFiscalYearParam(searchParams.get('fiscalYear'));
    const where = {
      ...(departmentScope ?? {}),
      ...(fiscalYearFilter !== null && fiscalYearFilter !== ALL_FISCAL_YEARS
        ? { fiscalYear: fiscalYearFilter }
        : {}),
    };
    const rowsWhere = Object.keys(where).length > 0 ? where : undefined;

    const rows = await prisma.budgetRequest.findMany({
      where: rowsWhere,
      include: {
        budgetPlan: { select: { code: true, subject: true } },
        department: { select: { name: true } },
        approvalSchema: {
          include: {
            approvalLevels: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const requestorIds = Array.from(
      new Set(rows.map((row) => row.requestorId).filter((id): id is string => Boolean(id)))
    );
    const requestorUsers = requestorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: requestorIds } },
          select: { id: true, name: true },
        })
      : [];
    const requestorNameMap = new Map(requestorUsers.map((user) => [user.id, user.name]));

    // Batched history lookup so multi-step `canReview` stays accurate without
    // an N+1 query: a single fetch keyed by entityId, then bucketed in memory.
    const rowIds = rows.map((row) => row.id);
    const allHistories = rowIds.length
      ? await prisma.activityHistory.findMany({
          where: { entityType: 'BudgetRequest', entityId: { in: rowIds } },
          select: { entityId: true, action: true, details: true, timestamp: true },
        })
      : [];
    const historiesByEntity = new Map<string, BudgetPlanHistoryEntry[]>();
    for (const h of allHistories) {
      const bucket = historiesByEntity.get(h.entityId) ?? [];
      bucket.push(h as unknown as BudgetPlanHistoryEntry);
      historiesByEntity.set(h.entityId, bucket);
    }

    const requests = rows.map(({ approvalSchema, ...r }) => ({
      ...r,
      grandTotal: Number(r.grandTotal ?? 0),
      totalAmount: Number(r.totalAmount ?? 0),
      vatAmount: Number(r.vatAmount ?? 0),
      whtAmount: Number(r.whtAmount ?? 0),
      invoiceAmount: Number(r.invoiceAmount ?? 0),
      requestorName: r.requestorId ? requestorNameMap.get(r.requestorId) ?? null : null,
      canEdit:
        !!session?.user?.id &&
        r.requestorId === session.user.id,
      canReview:
        !!session?.user?.id &&
        canUserActOnCurrentStep({
          status: r.status,
          approvalLevels: approvalSchema?.approvalLevels ?? [],
          histories: historiesByEntity.get(r.id) ?? [],
          userRoleIds,
          requestorId: r.requestorId ?? null,
          actorUserId: session.user.id,
        }),
    }));
    const plans = await prisma.budgetPlan.findMany({
      // Same cross-department view rule applies to the BP dropdown so users
      // without permission don't see other departments' BPs as picker options.
      where: { status: 'Approved', ...(departmentScope ?? {}) },
      select: {
        id: true,
        code: true,
        subject: true,
        description: true,
        fiscalYear: true,
        originOffice: true,
        departmentId: true,
        projectId: true,
        categoryId: true,
        categoryKeyIndexId: true,
        costCenterId: true,
        coaId: true,
        opexType: true,
        opexAllocationId: true,
        category: { select: { name: true } },
        costCenter: { select: { name: true } },
        categoryKeyIndex: { select: { name: true } },
        opexAllocation: { select: { name: true } },
      },
    });
    return NextResponse.json({ requests, plans });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      budgetPlanId,
      subject,
      description,
      departmentId,
      notes,
      approvalSchemaId,
      category,
      categoryKeyIndex,
      costCenter,
      coa,
      type,
      opexAllocation,
      opexType,
      originOffice,
      projectId,
    } = body;

    if (!subject || !departmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!approvalSchemaId || typeof approvalSchemaId !== 'string') {
      return NextResponse.json({ error: 'Approval schema is required' }, { status: 400 });
    }

    const normalizedBudgetPlanId =
      typeof budgetPlanId === 'string' && budgetPlanId.trim().length > 0 ? budgetPlanId : null;

    // Defense in depth: enforce the cross-department permission server-side.
    const departmentVerdict = assertCanActOnDepartment(session, departmentId);
    if (!departmentVerdict.ok) {
      return NextResponse.json({ error: departmentVerdict.message }, { status: 403 });
    }

    const normalizedPayload = normalizeBudgetRequestBody(body, new Date().getFullYear());
    if ('error' in normalizedPayload) {
      return NextResponse.json({ error: normalizedPayload.error }, { status: 400 });
    }
    const {
      normalizedLineItems,
      totalAmount,
      year,
      normalizedVatPercent,
      normalizedWhtPercent,
      normalizedVatAmount,
      normalizedWhtAmount,
      normalizedInvoiceAmount,
      normalizedGrandTotal,
      monthlyAllocations,
    } = normalizedPayload;

    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || !Number.isFinite(normalizedGrandTotal) || normalizedGrandTotal <= 0) {
      return NextResponse.json(
        { error: 'Grand total must be greater than 0' },
        { status: 400 },
      );
    }

    const [dept, selectedPlan, selectedSchema] = await Promise.all([
      prisma.department.findUnique({ where: { id: departmentId } }),
      normalizedBudgetPlanId
        ? prisma.budgetPlan.findUnique({
            where: { id: normalizedBudgetPlanId },
            select: {
              id: true,
              status: true,
              categoryId: true,
              coaId: true,
              opexType: true,
              opexAllocationId: true,
            },
          })
        : Promise.resolve(null),
      prisma.approvalSchema.findUnique({
        where: { id: approvalSchemaId },
        select: { id: true, departmentId: true, type: true },
      }),
    ]);
    if (!dept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 400 });
    }
    if (!dept.isActive) {
      return NextResponse.json(
        { error: `Department ${dept.code} is inactive and cannot be selected` },
        { status: 400 },
      );
    }
    if (!selectedSchema) {
      return NextResponse.json({ error: 'Approval schema not found' }, { status: 400 });
    }
    if (selectedSchema.departmentId !== departmentId) {
      return NextResponse.json(
        { error: 'Approval schema must belong to the selected department' },
        { status: 400 },
      );
    }
    if (selectedSchema.type !== 'BudgetRequest') {
      return NextResponse.json(
        { error: 'Approval schema type must be BudgetRequest' },
        { status: 400 },
      );
    }
    if (normalizedBudgetPlanId && !selectedPlan) {
      return NextResponse.json({ error: 'Budget plan not found' }, { status: 400 });
    }
    if (selectedPlan && selectedPlan.status !== 'Approved') {
      return NextResponse.json({ error: 'Budget plan must be approved' }, { status: 400 });
    }
    const now = new Date();
    const codeYear = String(now.getFullYear());
    const codeMonth = String(now.getMonth() + 1).padStart(2, '0');
    const departmentCode = (dept?.code ?? 'XX').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const codePrefix = `BR${departmentCode}${codeYear}${codeMonth}`;
    const count = await prisma.budgetRequest.count({
      where: {
        code: {
          startsWith: codePrefix,
        },
      },
    });
    const code = `${codePrefix}${String(count + 1).padStart(3, '0')}`;

    const normalizedOriginOffice = normalizeOptionalString(originOffice);
    const normalizedProjectId = normalizeOptionalString(projectId);

    const br = await prisma.budgetRequest.create({
      data: {
        code,
        budgetPlanId: normalizedBudgetPlanId,
        subject,
        description: description ?? null,
        fiscalYear: year,
        originOffice: normalizedOriginOffice,
        departmentId,
        projectId: normalizedProjectId,
        requestorId: session.user.id,
        requestDate: new Date(),
        totalAmount,
        vatPercent: normalizedVatPercent,
        vatAmount: normalizedVatAmount,
        whtPercent: normalizedWhtPercent,
        whtAmount: normalizedWhtAmount,
        invoiceAmount: normalizedInvoiceAmount,
        grandTotal: normalizedGrandTotal,
        notes: notes ?? null,
        approvalSchemaId: approvalSchemaId || null,
        category: (category as string) || selectedPlan?.categoryId || null,
        categoryKeyIndex: (categoryKeyIndex as string) || null,
        costCenter: (costCenter as string) || null,
        coa: (coa as string) || selectedPlan?.coaId || null,
        type: (type as string) || selectedPlan?.opexType || null,
        opexAllocation: (opexAllocation as string) || selectedPlan?.opexAllocationId || null,
        opexType: (opexType as string) || selectedPlan?.opexType || null,
        supportingDocs: supportingDocsForPersistence(body.supportingDocs),
        lineItems: {
          create: normalizedLineItems.map((li) => ({
            item: li.item ?? '',
            qty: Math.round(toNumber(li.qty)),
            unitPrice: toNumber(li.unitPrice),
            subtotal: toNumber(li.subtotal),
            deduction: toNumber(li.deduction),
            total: toNumber(li.total),
          })),
        },
        allocations: {
          create: monthlyAllocations,
        },
      },
      include: {
        lineItems: true,
        allocations: true,
        budgetPlan: { select: { code: true, subject: true } },
        department: { select: { name: true } },
      },
    });

    const totalRequested = (br.lineItems ?? []).reduce(
      (sum, li) => sum + Number(li.total ?? 0),
      0
    );

    await logActivity({
      userId: session.user.id,
      entityType: 'BudgetRequest',
      entityId: br.id,
      entityCode: br.code,
      action: 'create',
      details: {
        subject: br.subject,
        description: br.description,
        fiscalYear: br.fiscalYear,
        status: br.status,
        budgetPlanCode: br.budgetPlan?.code ?? null,
        budgetPlanSubject: br.budgetPlan?.subject ?? null,
        departmentName: br.department?.name ?? null,
        notes: br.notes,
        approvalSchemaId: br.approvalSchemaId,
        lineItemCount: br.lineItems.length,
        totalRequested,
        vatPercent: Number(br.vatPercent ?? 0),
        vatAmount: Number(br.vatAmount ?? 0),
        whtPercent: Number(br.whtPercent ?? 0),
        whtAmount: Number(br.whtAmount ?? 0),
        invoiceAmount: Number(br.invoiceAmount ?? 0),
        grandTotal: Number(br.grandTotal ?? 0),
        monthCount: br.allocations.length,
        allocations: (br.allocations ?? []).map((allocation) => ({
          year: allocation.year,
          month: allocation.month,
          allocation: Number(allocation.allocation),
        })),
      },
    });

    await createBudgetRequestNotifications({
      requestId: br.id,
      actorUserId: session.user.id,
      status: 'Draft',
      requestCode: br.code,
      variant: 'submit',
    });

    return NextResponse.json(br);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
