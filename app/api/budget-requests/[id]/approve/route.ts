import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import {
  canUserActOnCurrentStep,
  getBudgetPlanUserRoleIds,
  getNextApprovalStep,
} from '@/lib/budget-plan-review-eligibility';
import type { BudgetPlanHistoryEntry } from '@/lib/budget-plan-approval-display';
import { createBudgetRequestNotifications } from '@/lib/budget-request-notifications';
import { canEditClassificationFields } from '@/lib/access/classification';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const before = await prisma.budgetRequest.findUnique({
      where: { id },
      include: {
        budgetPlan: { select: { code: true, subject: true } },
        department: { select: { name: true } },
        lineItems: { select: { item: true, qty: true, unitPrice: true, deduction: true, total: true } },
        approvalSchema: {
          include: {
            approvalLevels: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
    });
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (before.status === 'Approved' && body?.action !== 'revision' && body?.action !== 'decline') {
      return NextResponse.json({ error: 'Already approved' }, { status: 400 });
    }

    const levels = before.approvalSchema?.approvalLevels ?? [];
    const userRoleIds = await getBudgetPlanUserRoleIds(session.user.id);
    // Used by the multi-step eligibility checks below; this is the *only*
    // way to tell apart "still on step 2 of a 4-step ladder" from "already
    // through every step" when `status === 'Reviewed'`.
    const histories = (await prisma.activityHistory.findMany({
      where: { entityType: 'BudgetRequest', entityId: id },
      select: { action: true, details: true, timestamp: true },
    })) as unknown as BudgetPlanHistoryEntry[];
    const action =
      body?.action === 'revision' ? 'revision' : body?.action === 'decline' ? 'decline' : 'approve';
    let newStatus: string;

    if (action === 'revision' || action === 'decline') {
      const allowed = canUserActOnCurrentStep({
        status: before.status,
        approvalLevels: levels,
        histories,
        userRoleIds,
        requestorId: before.requestorId ?? null,
        actorUserId: session.user.id,
      });
      if (!allowed) {
        return NextResponse.json({ error: 'You are not allowed to request revision at this stage' }, { status: 403 });
      }
      if (before.status === 'Approved') {
        return NextResponse.json(
          { error: action === 'decline' ? 'Approved request cannot be declined' : 'Approved request cannot be revised' },
          { status: 400 }
        );
      }
      newStatus = action === 'decline' ? 'Declined' : 'Revision';
    } else

    {
      if (levels.length === 0) {
        if (before.requestorId === session.user.id) {
          return NextResponse.json({ error: 'Requestor cannot approve own request' }, { status: 403 });
        }
        newStatus = 'Approved';
      } else {
        const allowed = canUserActOnCurrentStep({
          status: before.status,
          approvalLevels: levels,
          histories,
          userRoleIds,
          requestorId: before.requestorId ?? null,
          actorUserId: session.user.id,
        });
        if (!allowed) {
          return NextResponse.json({ error: 'You are not allowed to approve at this stage' }, { status: 403 });
        }
        const ordered = [...levels].sort((a, b) => a.stepOrder - b.stepOrder);
        const next = getNextApprovalStep(before.status, levels, histories);
        if (!next) {
          return NextResponse.json({ error: 'No approval step available' }, { status: 400 });
        }
        const isLastStep = next.stepOrder === ordered[ordered.length - 1]!.stepOrder;
        newStatus = isLastStep ? 'Approved' : 'Reviewed';
      }
    }

    const lineItemsFromReview = Array.isArray(body?.lineItems) ? body.lineItems : [];
    const qtyUnitPriceAdjusted =
      lineItemsFromReview.length > 0 &&
      (lineItemsFromReview.length !== before.lineItems.length ||
        lineItemsFromReview.some(
          (lineItem: { qty?: unknown; unitPrice?: unknown }, index: number) =>
            Math.max(0, Math.round(Number(lineItem.qty ?? 0))) !== Math.max(0, Number(before.lineItems[index]?.qty ?? 0)) ||
            Math.max(0, Number(lineItem.unitPrice ?? 0)) !== Math.max(0, Number(before.lineItems[index]?.unitPrice ?? 0))
        ));

    // Defense in depth: when the caller lacks `editClassificationSection`,
    // ignore any classification fields in the body and keep the persisted
    // values (matches the UI which renders those inputs disabled). Note
    // that BR uses denormalized text columns (`category`, `costCenter`,
    // `coa`, `opexAllocation`, `categoryKeyIndex`) rather than the `*Id`
    // foreign keys used by BP/PR — hence the inline projection here
    // instead of the shared `pickClassificationFields` helper.
    const allowClassificationEdit = canEditClassificationFields(session);
    const nextCategoryKeyIndex = allowClassificationEdit
      ? body?.categoryKeyIndexId ?? before.categoryKeyIndex ?? null
      : before.categoryKeyIndex ?? null;
    const nextCostCenter = allowClassificationEdit
      ? body?.costCenterId ?? before.costCenter ?? null
      : before.costCenter ?? null;
    const nextCategory = allowClassificationEdit
      ? body?.categoryId ?? before.category ?? null
      : before.category ?? null;
    const nextCoa = allowClassificationEdit
      ? body?.coaId ?? before.coa ?? null
      : before.coa ?? null;
    const nextType = allowClassificationEdit
      ? body?.opexType ?? before.type ?? null
      : before.type ?? null;
    const nextOpexType = allowClassificationEdit
      ? body?.opexType ?? before.opexType ?? null
      : before.opexType ?? null;
    const nextOpexAllocation = allowClassificationEdit
      ? (nextOpexType === 'OPEX' ? body?.opexAllocationId ?? before.opexAllocation ?? null : null)
      : before.opexAllocation ?? null;

    const updated = await prisma.budgetRequest.update({
      where: { id },
      data: {
        status: newStatus,
        categoryKeyIndex: nextCategoryKeyIndex,
        costCenter: nextCostCenter,
        category: nextCategory,
        coa: nextCoa,
        type: nextType,
        opexAllocation: nextOpexAllocation,
        opexType: nextOpexType,
      },
      select: { status: true },
    });
    if (lineItemsFromReview.length > 0) {
      const normalizedLineItems = lineItemsFromReview.map(
        (lineItem: { item?: string; qty?: unknown; unitPrice?: unknown; deduction?: unknown }) => {
          const qty = Math.max(0, Math.round(Number(lineItem.qty ?? 0)));
          const unitPrice = Math.max(0, Number(lineItem.unitPrice ?? 0));
          const deduction = Math.max(0, Number(lineItem.deduction ?? 0));
          const subtotal = qty * unitPrice;
          const total = Math.max(0, subtotal - deduction);
          return {
            item: String(lineItem.item ?? ''),
            qty,
            unitPrice,
            subtotal,
            deduction,
            total,
          };
        }
      );
      const totalAmount = normalizedLineItems.reduce(
        (sum: number, lineItem: { total: number }) => sum + lineItem.total,
        0
      );
      const vatPercent = Number(before.vatPercent ?? 11);
      const whtPercent = Number(before.whtPercent ?? 2);
      const vatAmount = Math.round(totalAmount * (vatPercent / 100));
      const whtAmount = Math.round(totalAmount * (whtPercent / 100));
      const invoiceAmount = totalAmount + vatAmount;
      const grandTotal = invoiceAmount - whtAmount;

      await prisma.$transaction(async (tx) => {
        await tx.budgetRequestLineItem.deleteMany({ where: { budgetRequestId: id } });
        await tx.budgetRequest.update({
          where: { id },
          data: {
            totalAmount,
            vatAmount,
            whtAmount,
            invoiceAmount,
            grandTotal,
            lineItems: {
              create: normalizedLineItems,
            },
          },
        });
      });
    }
    const totalRequested = lineItemsFromReview.length > 0
      ? lineItemsFromReview.reduce((sum: number, lineItem: { qty?: unknown; unitPrice?: unknown; deduction?: unknown }) => {
          const qty = Math.max(0, Math.round(Number(lineItem.qty ?? 0)));
          const unitPrice = Math.max(0, Number(lineItem.unitPrice ?? 0));
          const deduction = Math.max(0, Number(lineItem.deduction ?? 0));
          return sum + Math.max(0, qty * unitPrice - deduction);
        }, 0)
      : (before?.lineItems || []).reduce((sum, li) => sum + Number(li.total ?? 0), 0);
    const qtyUnitPriceAdjustmentNote = qtyUnitPriceAdjusted
      ? updated.status === 'Approved'
        ? 'Approved with qty/price item adjustment on review step.'
        : 'Reviewed with qty/price item adjustment.'
      : null;
    await logActivity({
      userId: session.user.id,
      entityType: 'BudgetRequest',
      entityId: id,
      entityCode: before?.code ?? undefined,
      action: 'approve',
      details: {
        fromStatus: before?.status ?? null,
        status: updated.status,
        subject: before?.subject ?? null,
        fiscalYear: before?.fiscalYear ?? null,
        budgetPlanCode: before?.budgetPlan?.code ?? null,
        budgetPlanSubject: before?.budgetPlan?.subject ?? null,
        departmentName: before?.department?.name ?? null,
        lineItemCount: before?.lineItems.length ?? 0,
        totalRequested,
        categoryKeyIndex: nextCategoryKeyIndex,
        costCenter: nextCostCenter,
        category: nextCategory,
        coa: nextCoa,
        type: nextType,
        opexAllocation: nextOpexAllocation,
        qtyUnitPriceAdjustmentNote,
        declineReason: action === 'revision' || action === 'decline' ? body?.declineReason ?? null : null,
        approvalNote:
          action === 'approve'
            ? (typeof body?.approvalNote === 'string' ? body.approvalNote.trim() || null : null)
            : null,
      },
    });
    await createBudgetRequestNotifications({
      requestId: id,
      actorUserId: session.user.id,
      status: updated.status,
      requestCode: before?.code ?? id,
      adjustmentNote: qtyUnitPriceAdjustmentNote,
      declineReason: action === 'revision' || action === 'decline' ? body?.declineReason ?? null : null,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
