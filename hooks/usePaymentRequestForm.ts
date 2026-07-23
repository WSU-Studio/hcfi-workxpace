'use client';

import { useMemo, useState } from 'react';
import type { BudgetRequestLineItemInput } from '@/components/budget-requests/BudgetRequestItemsEditor';
import {
  emptyRequestClassification,
  classificationFromStored,
  type RequestClassificationValue,
} from '@/lib/request-classification';
import {
  applyBudgetRequestToFormValues,
  ApprovedBudgetRequestOption,
  BudgetRequestChangeContext,
  buildEmptyLineItem,
  clearBudgetRequestSelection,
  computeTaxSummary,
  createDefaultFormValues,
  mapBrLineItemsToEditor,
  PaymentRequestFormValues,
} from '@/lib/payment-requests/form';

export function usePaymentRequestForm(initialValues?: Partial<PaymentRequestFormValues>) {
  const [formData, setFormData] = useState<PaymentRequestFormValues>({
    ...createDefaultFormValues(),
    ...initialValues,
  });
  const [lineItems, setLineItems] = useState<BudgetRequestLineItemInput[]>([buildEmptyLineItem()]);
  const [taxConfig, setTaxConfig] = useState({ vatPercent: 0, whtPercent: 0 });
  const [classification, setClassification] = useState<RequestClassificationValue>(
    emptyRequestClassification(),
  );

  const taxSummary = useMemo(
    () => computeTaxSummary(lineItems, taxConfig),
    [lineItems, taxConfig],
  );

  const isBudgetRequestSelected = formData.budgetRequestId !== '';

  const handleBudgetRequestChange = (
    budgetRequestId: string,
    context: BudgetRequestChangeContext,
    approvedBudgetRequests: ApprovedBudgetRequestOption[],
  ) => {
    if (!budgetRequestId) {
      setFormData((previous) => clearBudgetRequestSelection(previous, context));
      setLineItems([buildEmptyLineItem()]);
      setTaxConfig({ vatPercent: 0, whtPercent: 0 });
      setClassification(emptyRequestClassification());
      return;
    }

    const budgetRequest = approvedBudgetRequests.find((item) => item.id === budgetRequestId);
    if (!budgetRequest) {
      setFormData((previous) => ({ ...previous, budgetRequestId }));
      return;
    }

    setFormData((previous) =>
      applyBudgetRequestToFormValues(previous, budgetRequest, budgetRequestId),
    );
    setLineItems(mapBrLineItemsToEditor(budgetRequest.lineItems));
    setTaxConfig({
      vatPercent: Number.isFinite(budgetRequest.vatPercent) ? budgetRequest.vatPercent : 0,
      whtPercent: Number.isFinite(budgetRequest.whtPercent) ? budgetRequest.whtPercent : 0,
    });
    setClassification(classificationFromStored(budgetRequest));
  };

  return {
    formData,
    setFormData,
    lineItems,
    setLineItems,
    taxConfig,
    setTaxConfig,
    taxSummary,
    classification,
    setClassification,
    isBudgetRequestSelected,
    handleBudgetRequestChange,
  };
}
