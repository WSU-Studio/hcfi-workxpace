import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import {
  canUserActOnCurrentStep,
  getBudgetPlanUserRoleIds,
} from '@/lib/budget-plan-review-eligibility';
import type { BudgetPlanHistoryEntry } from '@/lib/budget-plan-approval-display';
import { createBudgetPlanNotifications } from '@/lib/budget-plan-notifications';
import { assertCanActOnDepartment, buildDepartmentScope } from '@/lib/access/cross-department';
import { ALL_FISCAL_YEARS, assertFiscalYearWritable, parseFiscalYearParam } from '@/lib/fiscal-year';
import { allocateNextBudgetPlanCode } from '@/lib/budget-plans/code';
import { isPrismaUniqueViolation } from '@/lib/prisma-errors';
import {
  budgetPlanFormValuesFromBody,
  validateRequiredBudgetPlanWriteFields,
} from '@/lib/budget-plans/form';
import {
  approvalLevelsOf,
  captureApprovalSchemaSnapshot,
} from '@/lib/approval-schema-snapshot';
import { loadActorDelegationContext } from '@/lib/approval-delegation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRoleIds = session?.user?.id ? await getBudgetPlanUserRoleIds(session.user.id) : [];
    const delegationCtx = session?.user?.id
      ? await loadActorDelegationContext(session.user.id)
      : null;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const departmentId = searchParams.get('departmentId') ?? '';

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { subject: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    // Optional fiscal-year scope (driven by the FY filter dropdown). Absent
    // or `all` ⇒ no restriction; a numeric year ⇒ exact-match WHERE clause.
    const fiscalYearFilter = parseFiscalYearParam(searchParams.get('fiscalYear'));
    if (fiscalYearFilter !== null && fiscalYearFilter !== ALL_FISCAL_YEARS) {
      where.fiscalYear = fiscalYearFilter;
    }

    // Apply cross-department view scoping LAST so a query string cannot
    // bypass the permission gate by passing another departmentId.
    const departmentScope = buildDepartmentScope(session);
    if (departmentScope) {
      where.departmentId = departmentScope.departmentId;
    }

    const plans = await prisma.budgetPlan.findMany({
      where,
      include: {
        department: { select: { id: true, code: true, name: true } },
        allocations: { orderBy: { month: 'asc' } },
        approvalSchema: { include: { approvalLevels: { include: { pics: { select: { userId: true } } } } } },
        _count: { select: { budgetRequests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const departments = await prisma.department.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });

    // Batched history lookup so multi-step `canReview` stays accurate without
    // an N+1 query: a single fetch keyed by entityId, then bucketed in memory.
    const planIds = plans.map((p) => p.id);
    const allHistories = planIds.length
      ? await prisma.activityHistory.findMany({
          where: { entityType: 'BudgetPlan', entityId: { in: planIds } },
          select: { entityId: true, action: true, details: true, timestamp: true },
        })
      : [];
    const historiesByEntity = new Map<string, BudgetPlanHistoryEntry[]>();
    for (const h of allHistories) {
      const bucket = historiesByEntity.get(h.entityId) ?? [];
      bucket.push(h as unknown as BudgetPlanHistoryEntry);
      historiesByEntity.set(h.entityId, bucket);
    }

    const enrichedPlans = plans.map((planRow) => {
      const { approvalSchema: _liveSchema, approvalSchemaSnapshot: _snapshot, _count, ...plan } =
        planRow;
      const budgetRequestCount = _count?.budgetRequests ?? 0;
      const isRequestor =
        !!session?.user?.id && plan.requestorId === session.user.id;
      // BR has been issued against this plan → freeze the plan for edits.
      // Even the original requestor cannot edit a plan that already drives BRs,
      // because changing it would invalidate the budget against issued requests.
      const canEdit = isRequestor && budgetRequestCount === 0;

      return {
        ...plan,
        budgetRequestCount,
        canEdit,
        canReview:
          !!session?.user?.id &&
          canUserActOnCurrentStep({
            status: plan.status,
            approvalLevels: approvalLevelsOf(planRow),
            histories: historiesByEntity.get(plan.id) ?? [],
            userRoleIds,
            requestorId: plan.requestorId ?? null,
            actorUserId: session.user.id,
            delegationCtx,
          }),
      };
    });

    return NextResponse.json({ plans: enrichedPlans, departments });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const writeFieldsError = validateRequiredBudgetPlanWriteFields(
      budgetPlanFormValuesFromBody(body),
    );
    if (writeFieldsError) {
      return NextResponse.json({ error: writeFieldsError.message }, { status: 400 });
    }
    if (!body.approvalSchemaId || typeof body.approvalSchemaId !== 'string') {
      return NextResponse.json({ error: 'Approval schema is required' }, { status: 400 });
    }

    const snapshotResult = await captureApprovalSchemaSnapshot(body.approvalSchemaId);
    if (!snapshotResult.ok) {
      return NextResponse.json({ error: snapshotResult.error }, { status: 400 });
    }

    // Defense in depth: even if the UI is bypassed, users without the
    // `createForOtherDepartment` permission must not create BPs for any
    // department other than their own.
    const departmentVerdict = assertCanActOnDepartment(session, body.departmentId);
    if (!departmentVerdict.ok) {
      return NextResponse.json({ error: departmentVerdict.message }, { status: 403 });
    }

    const dept = await prisma.department.findUnique({
      where: { id: body.departmentId },
      select: { code: true, isActive: true },
    });
    if (!dept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 400 });
    }
    if (!dept.isActive) {
      return NextResponse.json(
        { error: `Department ${dept.code} is inactive and cannot be selected` },
        { status: 400 },
      );
    }

    const allocations = body.allocations || [];
    const totalAllocation = allocations.reduce(
      (sum: number, a: { allocation: number }) => sum + Number(a?.allocation ?? 0),
      0,
    );
    if (!Number.isFinite(totalAllocation) || totalAllocation <= 0) {
      return NextResponse.json(
        { error: 'Total budget allocation must be greater than 0' },
        { status: 400 },
      );
    }

    const fiscalYearVerdict = assertFiscalYearWritable(body.fiscalYear);
    if (!fiscalYearVerdict.ok) {
      return NextResponse.json({ error: fiscalYearVerdict.error }, { status: 400 });
    }

    const now = new Date();
    const createPlan = async (code: string) =>
      prisma.budgetPlan.create({
        data: {
          code,
          subject: body.subject.trim(),
          description: body.description,
          fiscalYear: fiscalYearVerdict.year,
          originOffice: body.originOffice.trim(),
          departmentId: body.departmentId,
          projectId: body.projectId,
          requestorId: session.user.id,
          requestDate: new Date(),
          status: 'Draft',
          approvalSchemaId: body.approvalSchemaId || null,
          approvalSchemaSnapshot: snapshotResult.snapshot,
          supportingDocs: body.supportingDocs || null,
          coaId: body.coaId || null,
          categoryId: body.categoryId || null,
          categoryKeyIndexId: body.categoryKeyIndexId || null,
          costCenterId: body.costCenterId || null,
          opexId: null,
          opexAllocationId: body.opexType === 'OPEX' ? body.opexAllocationId || null : null,
          opexType: body.opexType || null,
        },
      });

    let plan;
    if (typeof body.code === 'string' && body.code.trim()) {
      plan = await createPlan(body.code.trim());
    } else {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          plan = await createPlan(await allocateNextBudgetPlanCode(prisma, dept.code, now));
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
          if (!isPrismaUniqueViolation(error, 'code')) throw error;
        }
      }
      if (!plan) {
        throw lastError instanceof Error
          ? lastError
          : new Error('Failed to allocate a unique budget plan code');
      }
    }

    const selectedMonths = allocations
      .filter((a: { month: number; allocation: number }) => Number(a?.allocation ?? 0) > 0)
      .map((a: { month: number }) => a.month)
      .sort((a: number, b: number) => a - b);
    for (let m = 1; m <= 12; m++) {
      const alloc = allocations.find((a: { month: number }) => a.month === m);
      await prisma.budgetPlanAllocation.create({
        data: {
          budgetPlanId: plan.id,
          month: m,
          allocation: alloc?.allocation ?? 0,
        },
      });
    }

    await logActivity({
      userId: session.user.id,
      entityType: 'BudgetPlan',
      entityId: plan.id,
      entityCode: plan.code,
      action: 'create',
      details: {
        subject: plan.subject,
        description: plan.description,
        status: plan.status,
        fiscalYear: plan.fiscalYear,
        originOffice: plan.originOffice,
        departmentCode: dept?.code ?? null,
        departmentId: plan.departmentId,
        projectId: plan.projectId,
        approvalSchemaId: plan.approvalSchemaId,
        monthCount: selectedMonths.length,
        selectedMonths,
        totalAllocation,
      },
    });

    // Fan-out to reviewers/approvers configured in the approval schema so
    // they know there's a fresh BP waiting for review.
    await createBudgetPlanNotifications({
      planId: plan.id,
      actorUserId: session.user.id,
      status: 'Draft',
      planCode: plan.code,
      variant: 'submit',
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Failed:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
