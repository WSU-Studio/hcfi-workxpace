import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { normalizeBudgetRequestBody, toNumber } from '@/lib/budget-request-normalize';
import { normalizeOptionalString } from '@/lib/budget-requests/display';
import { loadAccountOptions } from '@/lib/classification-options';
import {
  canUserActOnCurrentStep,
  getBudgetPlanUserRoleIds,
} from '@/lib/budget-plan-review-eligibility';
import type { BudgetPlanHistoryEntry } from '@/lib/budget-plan-approval-display';
import { createBudgetRequestNotifications } from '@/lib/budget-request-notifications';
import { sumPlanRealization } from '@/lib/budget-plan-realization';
import { loadOrvCreditsForBudgetPlan } from '@/lib/budget-plan-orv-credits';
import { supportingDocsForPersistence } from '@/lib/supporting-docs';
import {
  validateRequiredBudgetRequestWriteFields,
} from '@/lib/budget-requests/form';
import { schemaAppliesToDepartment } from '@/lib/approval-schema';
import { assertFiscalYearWritable } from '@/lib/fiscal-year';
import {
  approvalLevelsOf,
  snapshotForDocumentWrite,
  withFrozenApprovalSchema,
} from '@/lib/approval-schema-snapshot';

export const dynamic = 'force-dynamic';

type OriginOfficeMasterDelegate = {
  findMany: (args: {
    select: {
      code: true;
      name: true;
      isActive: true;
    };
    orderBy: Array<{ isActive: 'asc' | 'desc' } | { code: 'asc' | 'desc' }>;
  }) => Promise<
    Array<{
      code: string;
      name: string;
      isActive: boolean;
    }>
  >;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const br = await prisma.budgetRequest.findUnique({
      where: { id },
      include: {
        budgetPlan: {
          include: {
            project: { select: { name: true } },
            category: { select: { name: true } },
            costCenter: { select: { name: true } },
            categoryKeyIndex: { select: { name: true } },
            opexAllocation: { select: { name: true } },
            // Needed to compute the plan's total allocation; the BR review
            // page surfaces it alongside the plan's outstanding so reviewers
            // can gauge available budget before approving this request.
            allocations: { select: { month: true, allocation: true } },
          },
        },
        department: true,
        project: { select: { id: true, code: true, name: true } },
        lineItems: true,
        allocations: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
        },
        approvalSchema: {
          include: {
            approvalLevels: {
              include: { role: true, pics: { include: { user: { select: { id: true, name: true, employeeId: true } } } } },
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!br) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Sibling Budget Requests against the SAME plan that have already been
    // fully approved. Used to compute the plan's "realized" total, which
    // reviewers need on this page to decide whether the plan still has room
    // for the current request. We deliberately exclude the current BR (`id`)
    // so the projection "outstanding if this BR is approved" can be derived
    // cleanly on the client as `outstanding - this.grandTotal`, regardless
    // of whether this BR is itself already Approved.
    const siblingApprovedRequests = br.budgetPlanId
      ? await prisma.budgetRequest.findMany({
          where: {
            budgetPlanId: br.budgetPlanId,
            status: 'Approved',
            NOT: { id: br.id },
          },
          select: { requestDate: true, grandTotal: true, status: true },
        })
      : [];

    const planAllocationTotal = (br.budgetPlan?.allocations ?? []).reduce(
      (sum, allocation) => sum + Number(allocation.allocation ?? 0),
      0,
    );
    const orvCredits = br.budgetPlanId
      ? await loadOrvCreditsForBudgetPlan(br.budgetPlanId, br.budgetPlan!.fiscalYear)
      : [];
    const planRealization = br.budgetPlan
      ? sumPlanRealization(siblingApprovedRequests, br.budgetPlan.fiscalYear, orvCredits)
      : 0;
    const planOutstanding = planAllocationTotal - planRealization;
    const requestor = br.requestorId
      ? await prisma.user.findUnique({
          where: { id: br.requestorId },
          select: { name: true },
        })
      : null;
    const histories = await prisma.activityHistory.findMany({
      where: { entityType: 'BudgetRequest', entityId: id },
      include: { user: { select: { name: true } } },
      orderBy: { timestamp: 'desc' },
    });
    const userRoleIds = session?.user?.id ? await getBudgetPlanUserRoleIds(session.user.id) : [];
    const canReview =
      !!session?.user?.id &&
      canUserActOnCurrentStep({
        status: br.status,
        approvalLevels: approvalLevelsOf(br),
        histories: histories as unknown as BudgetPlanHistoryEntry[],
        userRoleIds,
        requestorId: br.requestorId ?? null,
        actorUserId: session.user.id,
      });
    const originOfficeMaster = (prisma as unknown as {
      originOfficeMaster: OriginOfficeMasterDelegate;
    }).originOfficeMaster;
    const [accountOptions, categoryOptions, categoryKeyIndexOptions, costCenterOptions, opexAllocationOptions, originOffices] = await Promise.all([
      loadAccountOptions(),
      prisma.categoryMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.categoryKeyIndexMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.costCenterMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.opexAllocationMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      originOfficeMaster.findMany({
        select: { code: true, name: true, isActive: true },
        orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
      }),
    ]);

    return NextResponse.json({
      ...withFrozenApprovalSchema(br),
      // Override `budgetPlan` (which `...br` already spread in) with the
      // enriched version carrying allocationTotal / realization / outstanding.
      // These are the *plan's* totals excluding the current BR, so the
      // reviewer can see how much room is still available before deciding.
      budgetPlan: br.budgetPlan
        ? {
            ...br.budgetPlan,
            allocationTotal: planAllocationTotal,
            realization: planRealization,
            outstanding: planOutstanding,
          }
        : null,
      requestorName: requestor?.name ?? null,
      histories,
      canReview,
      accountOptions,
      categoryOptions,
      categoryKeyIndexOptions,
      costCenterOptions,
      opexAllocationOptions,
      originOffices,
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.budgetRequest.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        requestorId: true,
        status: true,
        fiscalYear: true,
        budgetPlanId: true,
        departmentId: true,
        approvalSchemaId: true,
        approvalSchemaSnapshot: true,
      },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.requestorId !== session.user.id) {
      return NextResponse.json({ error: 'Only the requestor can edit this budget request' }, { status: 403 });
    }

    const {
      subject,
      description,
      notes,
      approvalSchemaId,
      budgetPlanId: bodyPlanId,
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
    if (!subject || typeof subject !== 'string') {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (!approvalSchemaId || typeof approvalSchemaId !== 'string') {
      return NextResponse.json({ error: 'Approval schema is required' }, { status: 400 });
    }

    const nextBudgetPlanId =
      typeof bodyPlanId === 'string'
        ? bodyPlanId.trim() || null
        : existing.budgetPlanId;

    let plan: {
      id: string;
      departmentId: string;
      status: string;
      fiscalYear: number;
      categoryId: string | null;
      categoryKeyIndexId: string | null;
      costCenterId: string | null;
      coaId: string | null;
      opexType: string | null;
      opexAllocationId: string | null;
    } | null = null;

    if (nextBudgetPlanId) {
      plan = await prisma.budgetPlan.findUnique({
        where: { id: nextBudgetPlanId },
        select: {
          id: true,
          departmentId: true,
          status: true,
          fiscalYear: true,
          categoryId: true,
          categoryKeyIndexId: true,
          costCenterId: true,
          coaId: true,
          opexType: true,
          opexAllocationId: true,
        },
      });
      if (!plan) return NextResponse.json({ error: 'Budget plan not found' }, { status: 400 });
      if (plan.status !== 'Approved') {
        return NextResponse.json({ error: 'Budget plan must be approved' }, { status: 400 });
      }
    }

    const nextDepartmentId =
      plan?.departmentId ??
      (typeof body.departmentId === 'string' && body.departmentId.trim().length > 0
        ? body.departmentId
        : existing.departmentId);
    if (!nextDepartmentId) {
      return NextResponse.json({ error: 'Department is required' }, { status: 400 });
    }

    const writeFieldsError = validateRequiredBudgetRequestWriteFields({
      departmentId: nextDepartmentId,
      projectId: typeof projectId === 'string' ? projectId : '',
      description: typeof description === 'string' ? description : '',
      notes: typeof notes === 'string' ? notes : '',
    });
    if (writeFieldsError) {
      return NextResponse.json({ error: writeFieldsError.message }, { status: 400 });
    }

    const selectedSchema = await prisma.approvalSchema.findUnique({
      where: { id: approvalSchemaId },
      select: { id: true, departmentId: true, type: true },
    });
    if (!selectedSchema) {
      return NextResponse.json({ error: 'Approval schema not found' }, { status: 400 });
    }
    if (!schemaAppliesToDepartment(selectedSchema.departmentId, nextDepartmentId)) {
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

    const snapshotResult = await snapshotForDocumentWrite({
      schemaId: approvalSchemaId,
      previousSchemaId: existing.approvalSchemaId,
      previousSnapshot: existing.approvalSchemaSnapshot,
    });
    if (!snapshotResult.ok) {
      return NextResponse.json({ error: snapshotResult.error }, { status: 400 });
    }

    const normalizedPayload = normalizeBudgetRequestBody(body, existing.fiscalYear);
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

    const fiscalYearVerdict = assertFiscalYearWritable(year, [existing.fiscalYear, plan?.fiscalYear]);
    if (!fiscalYearVerdict.ok) {
      return NextResponse.json({ error: fiscalYearVerdict.error }, { status: 400 });
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || !Number.isFinite(normalizedGrandTotal) || normalizedGrandTotal <= 0) {
      return NextResponse.json(
        { error: 'Grand total must be greater than 0' },
        { status: 400 },
      );
    }

    const normalizedOriginOffice = normalizeOptionalString(originOffice);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.budgetRequestLineItem.deleteMany({ where: { budgetRequestId: id } });
      await tx.budgetRequestAllocation.deleteMany({ where: { budgetRequestId: id } });
      return tx.budgetRequest.update({
        where: { id },
        data: {
          budgetPlanId: nextBudgetPlanId,
          subject: typeof subject === 'string' ? subject.trim() : subject,
          description,
          fiscalYear: fiscalYearVerdict.year,
          originOffice: normalizedOriginOffice,
          departmentId: nextDepartmentId,
          projectId: typeof projectId === 'string' ? projectId.trim() : projectId,
          status: 'Draft',
          totalAmount,
          vatPercent: normalizedVatPercent,
          vatAmount: normalizedVatAmount,
          whtPercent: normalizedWhtPercent,
          whtAmount: normalizedWhtAmount,
          invoiceAmount: normalizedInvoiceAmount,
          grandTotal: normalizedGrandTotal,
          notes: typeof notes === 'string' ? notes.trim() : notes,
          approvalSchemaId: approvalSchemaId || null,
          approvalSchemaSnapshot: snapshotResult.snapshot,
          category: (category as string) || plan?.categoryId || null,
          categoryKeyIndex: (categoryKeyIndex as string) || plan?.categoryKeyIndexId || null,
          costCenter: (costCenter as string) || plan?.costCenterId || null,
          coa: (coa as string) || plan?.coaId || null,
          type: (type as string) || plan?.opexType || null,
          opexAllocation: (opexAllocation as string) || plan?.opexAllocationId || null,
          opexType: (opexType as string) || plan?.opexType || null,
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
          allocations: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
          budgetPlan: {
            include: {
              project: { select: { name: true } },
              category: { select: { name: true } },
              costCenter: { select: { name: true } },
              categoryKeyIndex: { select: { name: true } },
              opexAllocation: { select: { name: true } },
            },
          },
          department: true,
          project: { select: { id: true, code: true, name: true } },
          approvalSchema: {
            include: {
              approvalLevels: {
                include: { role: true, pics: { include: { user: { select: { id: true, name: true, employeeId: true } } } } },
                orderBy: { stepOrder: 'asc' },
              },
            },
          },
        },
      });
    });

    const br = updated;

    const totalRequested = (br.lineItems ?? []).reduce(
      (sum, li) => sum + toNumber(li.total),
      0
    );

    await logActivity({
      userId: session.user.id,
      entityType: 'BudgetRequest',
      entityId: id,
      entityCode: br.code,
      action: 'update',
      details: {
        subject: br.subject,
        description: br.description,
        fiscalYear: br.fiscalYear,
        status: br.status,
        previousStatus: existing.status,
        note: 'Request updated by requestor. Approval restarted from step 1.',
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
      },
    });

    await createBudgetRequestNotifications({
      requestId: id,
      actorUserId: session.user.id,
      status: 'Draft',
      requestCode: br.code,
      variant: 'resubmit',
    });

    const histories = await prisma.activityHistory.findMany({
      where: { entityType: 'BudgetRequest', entityId: id },
      include: { user: { select: { name: true } } },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({ ...withFrozenApprovalSchema(br), histories });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
