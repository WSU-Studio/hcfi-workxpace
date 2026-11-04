import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { loadAccountOptions } from '@/lib/classification-options';
import {
  canUserActOnCurrentStep,
  getBudgetPlanUserRoleIds,
  getNextApprovalStep,
  isNextStepFinal,
  resolveOnBehalfOfDelegator,
} from '@/lib/budget-plan-review-eligibility';
import type { BudgetPlanHistoryEntry } from '@/lib/budget-plan-approval-display';
import { enrichAllocationsWithRealization } from '@/lib/budget-plan-realization';
import { loadOrvCreditsForBudgetPlan } from '@/lib/budget-plan-orv-credits';
import { createBudgetPlanNotifications } from '@/lib/budget-plan-notifications';
import {
  canEditClassificationFields,
  pickClassificationFields,
} from '@/lib/access/classification';
import { selectableDepartmentWhere } from '@/lib/department/selectable';
import { assertFiscalYearWritable, fiscalYearSelectOptions } from '@/lib/fiscal-year';
import {
  budgetPlanFormValuesFromBody,
  validateRequiredBudgetPlanWriteFields,
} from '@/lib/budget-plans/form';
import { loadActorDelegationContext } from '@/lib/approval-delegation';
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

/**
 * Allow a reviewer to take any of these actions from a non-terminal status.
 * Intent normalization happens later — the body status is treated as the
 * caller's desire, and the actual persisted status is derived from where the
 * BP is in its multi-step ladder.
 */
const REVIEW_INTENT_STATUSES = new Set(['Reviewed', 'Approved', 'Revision', 'Declined']);
const REVIEWABLE_FROM_STATUSES = new Set(['Draft', 'Pending', 'Reviewed']);


export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const plan = await prisma.budgetPlan.findUnique({
      where: { id },
      include: {
        department: true,
        project: true,
        allocations: { orderBy: { month: 'asc' } },
        approvalSchema: { include: { approvalLevels: { include: { role: true, pics: { include: { user: { select: { id: true, name: true, employeeId: true } } } } }, orderBy: { stepOrder: 'asc' } } } },
        category: true,
        categoryKeyIndex: true,
        costCenter: true,
        opex: true,
        opexAllocation: true,
        _count: { select: { budgetRequests: true } },
      },
    });
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const requestor = plan.requestorId
      ? await prisma.user.findUnique({
          where: { id: plan.requestorId },
          select: { name: true },
        })
      : null;

    const fiscalYears = fiscalYearSelectOptions([plan.fiscalYear]);
    const departments = await prisma.department.findMany({
      where: selectableDepartmentWhere([plan.departmentId]),
      orderBy: { code: 'asc' },
    });
    const projects = await prisma.project.findMany({ orderBy: { code: 'asc' } });
    const originOfficeMaster = (prisma as unknown as {
      originOfficeMaster: OriginOfficeMasterDelegate;
    }).originOfficeMaster;

    const [accountOptions, approvalSchemas, categoryOptions, categoryKeyIndexOptions, costCenterOptions, opexOptions, opexAllocationOptions, originOffices, histories] = await Promise.all([
      loadAccountOptions(),
      prisma.approvalSchema.findMany({
        where: { type: 'BudgetPlan' },
        include: { department: true, approvalLevels: { include: { role: true, pics: { include: { user: { select: { id: true, name: true, employeeId: true } } } } } } },
      }),
      prisma.categoryMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.categoryKeyIndexMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.costCenterMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.opexMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.opexAllocationMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      originOfficeMaster.findMany({
        select: {
          code: true,
          name: true,
          isActive: true,
        },
        orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
      }),
      prisma.activityHistory.findMany({
        where: { entityType: 'BudgetPlan', entityId: id },
        include: { user: { select: { name: true } } },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    let canReview = false;
    let nextStepOrder: number | null = null;
    const approvalLevels = approvalLevelsOf(plan);
    if (session?.user?.id && approvalLevels.length) {
      const userRoleIds = await getBudgetPlanUserRoleIds(session.user.id);
      const delegationCtx = await loadActorDelegationContext(session.user.id);
      const next = getNextApprovalStep(
        plan.status,
        approvalLevels,
        histories as unknown as BudgetPlanHistoryEntry[],
      );
      nextStepOrder = next?.stepOrder ?? null;
      canReview =
        !!session?.user?.id &&
        canUserActOnCurrentStep({
          status: plan.status,
          approvalLevels,
          histories: histories as unknown as BudgetPlanHistoryEntry[],
          userRoleIds,
          requestorId: plan.requestorId ?? null,
          actorUserId: session.user.id,
          delegationCtx,
        });
    }

    const budgetRequestCount = plan._count?.budgetRequests ?? 0;
    const isRequestor = !!session?.user?.id && plan.requestorId === session.user.id;
    const canEdit = isRequestor && budgetRequestCount === 0;
    const editLockReason = !isRequestor
      ? null
      : budgetRequestCount > 0
        ? `Locked: ${budgetRequestCount} budget request${budgetRequestCount > 1 ? 's have' : ' has'} been issued against this plan.`
        : null;

    // Realization & Outstanding are sensitive financial figures gated by the
    // `viewBudgetPlanRealization` activity permission. If the caller lacks it, we
    // skip both the BR query (saves a roundtrip) and the enrichment, and ship
    // the plain allocation rows only — defence-in-depth alongside the UI gate.
    const canViewRealization = Boolean(
      session?.user?.access?.activityAccess?.viewBudgetPlanRealization,
    );
    const enrichedAllocations = canViewRealization
      ? enrichAllocationsWithRealization(
          plan.allocations,
          budgetRequestCount > 0
            ? await prisma.budgetRequest.findMany({
                where: { budgetPlanId: id },
                // `status` is required so the realization bucket can filter
                // out non-Approved BRs (Draft / Pending / Revision / etc.)
                // — only fully-approved requests count as realized budget.
                select: {
                  requestDate: true,
                  grandTotal: true,
                  status: true,
                  allocations: { select: { month: true, allocation: true } },
                },
              })
            : [],
          plan.fiscalYear,
          await loadOrvCreditsForBudgetPlan(id, plan.fiscalYear),
        )
      : plan.allocations.map((a) => ({
          month: a.month,
          allocation: Number(a.allocation ?? 0),
        }));

    return NextResponse.json({
      plan: {
        ...withFrozenApprovalSchema(plan),
        allocations: enrichedAllocations,
        requestorName: requestor?.name ?? null,
        budgetRequestCount,
      },
      fiscalYears,
      departments,
      projects,
      approvalSchemas,
      accountOptions,
      categoryOptions,
      categoryKeyIndexOptions,
      costCenterOptions,
      opexOptions,
      opexAllocationOptions,
      originOffices,
      histories,
      reviewMeta: { canReview, nextStepOrder },
      editMeta: { canEdit, editLockReason, budgetRequestCount },
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.budgetPlan.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        requestorId: true,
        status: true,
        fiscalYear: true,
        approvalSchemaId: true,
        approvalSchemaSnapshot: true,
        _count: { select: { budgetRequests: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.requestorId !== session.user.id) {
      return NextResponse.json({ error: 'Only requestor can edit this budget plan' }, { status: 403 });
    }
    const linkedRequestCount = existing._count?.budgetRequests ?? 0;
    if (linkedRequestCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot edit: ${linkedRequestCount} budget request${linkedRequestCount > 1 ? 's have' : ' has'} been issued against this plan.`,
        },
        { status: 409 }
      );
    }
    const writeFieldsError = validateRequiredBudgetPlanWriteFields(
      budgetPlanFormValuesFromBody(body),
    );
    if (writeFieldsError) {
      return NextResponse.json({ error: writeFieldsError.message }, { status: 400 });
    }
    if (!body.approvalSchemaId || typeof body.approvalSchemaId !== 'string') {
      return NextResponse.json({ error: 'Approval schema is required' }, { status: 400 });
    }

    const snapshotResult = await snapshotForDocumentWrite({
      schemaId: body.approvalSchemaId,
      previousSchemaId: existing.approvalSchemaId,
      previousSnapshot: existing.approvalSchemaSnapshot,
    });
    if (!snapshotResult.ok) {
      return NextResponse.json({ error: snapshotResult.error }, { status: 400 });
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

    const fiscalYearVerdict = assertFiscalYearWritable(body.fiscalYear, [existing.fiscalYear]);
    if (!fiscalYearVerdict.ok) {
      return NextResponse.json({ error: fiscalYearVerdict.error }, { status: 400 });
    }

    await prisma.budgetPlan.update({
      where: { id },
      data: {
        subject: body.subject.trim(),
        description: body.description,
        fiscalYear: fiscalYearVerdict.year,
        originOffice: body.originOffice.trim(),
        departmentId: body.departmentId,
        projectId: body.projectId,
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
        status: 'Draft',
      },
    });

    await prisma.budgetPlanAllocation.deleteMany({ where: { budgetPlanId: id } });
    const selectedMonths = allocations
      .filter((a: { month: number; allocation: number }) => Number(a?.allocation ?? 0) > 0)
      .map((a: { month: number }) => a.month)
      .sort((a: number, b: number) => a - b);
    for (let m = 1; m <= 12; m++) {
      const alloc = allocations.find((a: { month: number }) => a.month === m);
      await prisma.budgetPlanAllocation.create({
        data: {
          budgetPlanId: id,
          month: m,
          allocation: alloc?.allocation ?? 0,
        },
      });
    }

    await logActivity({
      userId: session.user.id,
      entityType: 'BudgetPlan',
      entityId: id,
      entityCode: existing.code,
      action: 'update',
      details: {
        status: 'Draft',
        previousStatus: existing.status,
        note: 'Plan updated by requestor. Approval restarted from step 1.',
        subject: body.subject ?? null,
        fiscalYear: fiscalYearVerdict.year ?? null,
        originOffice: body.originOffice ?? null,
        departmentId: body.departmentId ?? null,
        projectId: body.projectId ?? null,
        approvalSchemaId: body.approvalSchemaId ?? null,
        monthCount: selectedMonths.length,
        selectedMonths,
        totalAllocation,
      },
    });

    if (existing.status !== 'Draft') {
      await createBudgetPlanNotifications({
        planId: id,
        actorUserId: session.user.id,
        status: 'Draft',
        planCode: existing.code,
        variant: 'resubmit',
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    if (body.status) {
      const trackedFields = [
        'status',
        'coaId',
        'categoryId',
        'categoryKeyIndexId',
        'costCenterId',
        'opexType',
        'opexAllocationId',
      ] as const;
      const before = await prisma.budgetPlan.findUnique({
        where: { id },
        include: {
          approvalSchema: { include: { approvalLevels: { include: { pics: { select: { userId: true } } } } } },
          allocations: true,
        },
      });
      if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      // Multi-step approval gate. The body's `status` is treated as the
      // caller's *intent* (Reviewed / Approved = "advance one step";
      // Revision / Declined = "interrupt and bounce back to the requestor").
      // The actual persisted status is derived below based on where in the
      // schema we are, so a 3- or 4-step ladder progresses correctly instead
      // of getting stuck on step 2 like the old 2-step heuristic.
      let resolvedStatus: string = body.status;
      let onBehalfOf: { userId: string; name: string } | null = null;
      if (REVIEW_INTENT_STATUSES.has(body.status)) {
        if (!REVIEWABLE_FROM_STATUSES.has(before.status)) {
          return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
        }
        const levels = approvalLevelsOf(before);
        const reviewHistories = (await prisma.activityHistory.findMany({
          where: { entityType: 'BudgetPlan', entityId: id },
          select: { action: true, details: true, timestamp: true },
        })) as unknown as BudgetPlanHistoryEntry[];
        const next = getNextApprovalStep(before.status, levels, reviewHistories);
        if (!next) {
          return NextResponse.json({ error: 'No available review step' }, { status: 400 });
        }
        const userRoleIds = await getBudgetPlanUserRoleIds(session.user.id);
        const delegationCtx = await loadActorDelegationContext(session.user.id);
        const allowed = canUserActOnCurrentStep({
          status: before.status,
          approvalLevels: levels,
          histories: reviewHistories,
          userRoleIds,
          requestorId: before.requestorId ?? null,
          actorUserId: session.user.id,
          delegationCtx,
        });
        if (!allowed) {
          return NextResponse.json({ error: 'You are not allowed to review at this stage' }, { status: 403 });
        }
        onBehalfOf = resolveOnBehalfOfDelegator({
          level: next,
          actorUserId: session.user.id,
          userRoleIds,
          ctx: delegationCtx,
        });
        if (body.status === 'Reviewed' || body.status === 'Approved') {
          // Approve intent → land on `Approved` only if this is the final
          // step; otherwise advance one rung to `Reviewed`.
          resolvedStatus = isNextStepFinal(before.status, levels, reviewHistories)
            ? 'Approved'
            : 'Reviewed';
        }
        // For Revision / Declined we just persist the body status as-is.
      }
      body.status = resolvedStatus;

      // Defense in depth: the UI renders the Classification section as
      // read-only for users without `editClassificationSection`, but a
      // direct PATCH could still try to slip those fields in. Project the
      // incoming body onto either the caller-supplied overrides (allowed)
      // or the persisted values (not allowed) so the approve/decline flow
      // still succeeds without partially overwriting accounting tags.
      const classification = pickClassificationFields(
        {
          coaId: body.coaId,
          categoryId: body.categoryId,
          categoryKeyIndexId: body.categoryKeyIndexId,
          costCenterId: body.costCenterId,
          opexType: body.opexType,
          opexAllocationId: body.opexAllocationId,
        },
        {
          coaId: before.coaId,
          categoryId: before.categoryId,
          categoryKeyIndexId: before.categoryKeyIndexId,
          costCenterId: before.costCenterId,
          opexType: before.opexType,
          opexAllocationId: before.opexAllocationId,
        },
        canEditClassificationFields(session),
      );

      const updated = await prisma.budgetPlan.update({
        where: { id },
        data: {
          status: body.status,
          coaId: classification.coaId,
          categoryId: classification.categoryId,
          categoryKeyIndexId: classification.categoryKeyIndexId,
          costCenterId: classification.costCenterId,
          opexId: null,
          opexAllocationId: classification.opexAllocationId,
          opexType: classification.opexType,
        },
        select: {
          status: true,
          coaId: true,
          categoryId: true,
          categoryKeyIndexId: true,
          costCenterId: true,
          opexType: true,
          opexAllocationId: true,
        },
      });

      let allocationAdjusted = false;
      if (Array.isArray(body.allocations)) {
        const incomingAllocationMap = new Map<number, number>();
        body.allocations.forEach((item: { month: number; allocation: unknown }) => {
          incomingAllocationMap.set(Number(item.month), Number(item.allocation ?? 0));
        });
        allocationAdjusted = [...Array(12)].some((_, index) => {
          const month = index + 1;
          const beforeValue =
            Number(before.allocations.find((allocation) => allocation.month === month)?.allocation ?? 0);
          const afterValue = Number(incomingAllocationMap.get(month) ?? 0);
          return beforeValue !== afterValue;
        });

        await prisma.budgetPlanAllocation.deleteMany({ where: { budgetPlanId: id } });
        for (let month = 1; month <= 12; month++) {
          const allocationEntry = body.allocations.find((item: { month: number }) => item.month === month);
          await prisma.budgetPlanAllocation.create({
            data: {
              budgetPlanId: id,
              month,
              allocation: Number(allocationEntry?.allocation ?? 0),
            },
          });
        }
      }

      const beforeState: Record<string, unknown> = {
        status: before.status,
        coaId: before.coaId,
        categoryId: before.categoryId,
        categoryKeyIndexId: before.categoryKeyIndexId,
        costCenterId: before.costCenterId,
        opexType: before.opexType,
        opexAllocationId: before.opexAllocationId,
      };

      const afterState: Record<string, unknown> = {
        status: updated.status,
        coaId: updated.coaId,
        categoryId: updated.categoryId,
        categoryKeyIndexId: updated.categoryKeyIndexId,
        costCenterId: updated.costCenterId,
        opexType: updated.opexType,
        opexAllocationId: updated.opexAllocationId,
      };

      const previousState: Record<string, unknown> = {};
      const currentState: Record<string, unknown> = {};
      trackedFields.forEach((field) => {
        const prevValue = beforeState[field] ?? null;
        const currValue = afterState[field] ?? null;
        if (prevValue !== currValue) {
          previousState[field] = prevValue;
          currentState[field] = currValue;
        }
      });

      // For Review / Approve intents we ALWAYS persist the post-action status
      // in the history entry — even when the DB column didn't actually
      // change. In a multi-step ladder the same `Reviewed` status can carry
      // across several reviewer steps (step 2 of a 4-step schema lands on
      // `Reviewed` just like step 1 did), and the diff-only loop above would
      // otherwise drop the event entirely. Downstream helpers
      // (`getMultiStepApprovalProgress`, `countCompletedApprovalSteps`)
      // detect "this reviewer step is done" by reading status off history
      // entries; a blank `currentState` would silently freeze the escalation
      // table on the previous step. See BR/PR `approve/route.ts` for the
      // equivalent flat `details.status` pattern that has always worked.
      if (body.status === 'Reviewed' || body.status === 'Approved') {
        previousState.status = beforeState.status ?? null;
        currentState.status = afterState.status ?? null;
      }

      if (body.declineReason !== undefined) {
        const trimmedDeclineReason =
          typeof body.declineReason === 'string' ? body.declineReason.trim() || null : null;
        previousState.declineReason = null;
        currentState.declineReason = trimmedDeclineReason;
      }
      let approvalNoteForHistory: string | null | undefined;
      if (body.approvalNote !== undefined) {
        approvalNoteForHistory =
          typeof body.approvalNote === 'string' ? body.approvalNote.trim() || null : null;
        previousState.approvalNote = null;
        currentState.approvalNote = approvalNoteForHistory;
      }
      const allocationAdjustmentNote = allocationAdjusted
        ? body.status === 'Approved'
          ? 'Approved with allocation adjustment.'
          : body.status === 'Reviewed'
            ? 'Reviewed with allocation adjustment.'
            : 'Allocation adjustment done during review process.'
        : null;
      if (allocationAdjusted) {
        currentState.allocationAdjustmentNote = allocationAdjustmentNote;
      }

      await logActivity({
        userId: session.user.id,
        entityType: 'BudgetPlan',
        entityId: id,
        entityCode: before.code,
        action: body.status === 'Approved' ? 'approve' : body.status === 'Reviewed' ? 'review' : 'update',
        details: {
          previousState,
          currentState,
          allocationAdjustmentNote,
          ...(body.declineReason !== undefined
            ? {
                declineReason:
                  typeof body.declineReason === 'string' ? body.declineReason.trim() || null : null,
              }
            : {}),
          ...(approvalNoteForHistory !== undefined ? { approvalNote: approvalNoteForHistory } : {}),
          ...(onBehalfOf
            ? { onBehalfOfUserId: onBehalfOf.userId, onBehalfOfName: onBehalfOf.name }
            : {}),
        },
      });

      await createBudgetPlanNotifications({
        planId: id,
        actorUserId: session.user.id,
        status: body.status,
        planCode: before.code,
        declineReason: body.declineReason ?? null,
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
