'use client';

import { useMemo, useRef, useState } from 'react';
import type { BudgetRequestLineItemInput } from '@/components/budget-requests/BudgetRequestItemsEditor';
import {
  applyPlanToFormValues,
  BudgetRequestFormValues,
  BudgetRequestPlanOption,
  BudgetRequestValidationField,
  buildEmptyLineItem,
  computeTaxSummary,
  createDefaultFormValues,
  fetchBudgetPlanDetails,
} from '@/lib/budget-requests/form';

export interface BudgetRequestFieldRefs {
  budgetPlan: React.RefObject<HTMLDivElement | null>;
  department: React.RefObject<HTMLDivElement | null>;
  project: React.RefObject<HTMLDivElement | null>;
  subject: React.RefObject<HTMLDivElement | null>;
  description: React.RefObject<HTMLDivElement | null>;
  notes: React.RefObject<HTMLDivElement | null>;
  supportingDocs: React.RefObject<HTMLDivElement | null>;
  months: React.RefObject<HTMLDivElement | null>;
  items: React.RefObject<HTMLDivElement | null>;
  approvalSchema: React.RefObject<HTMLDivElement | null>;
}

export function useBudgetRequestForm(initialValues?: Partial<BudgetRequestFormValues>) {
  const [formData, setFormData] = useState<BudgetRequestFormValues>({
    ...createDefaultFormValues(),
    ...initialValues,
  });
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [lineItems, setLineItems] = useState<BudgetRequestLineItemInput[]>([buildEmptyLineItem()]);
  const [taxConfig, setTaxConfig] = useState({ vatPercent: 0, whtPercent: 0 });

  const budgetPlanFieldRef = useRef<HTMLDivElement | null>(null);
  const departmentFieldRef = useRef<HTMLDivElement | null>(null);
  const projectFieldRef = useRef<HTMLDivElement | null>(null);
  const subjectFieldRef = useRef<HTMLDivElement | null>(null);
  const descriptionFieldRef = useRef<HTMLDivElement | null>(null);
  const notesFieldRef = useRef<HTMLDivElement | null>(null);
  const supportingDocsFieldRef = useRef<HTMLDivElement | null>(null);
  const monthsFieldRef = useRef<HTMLDivElement | null>(null);
  const itemsFieldRef = useRef<HTMLDivElement | null>(null);
  const approvalSchemaFieldRef = useRef<HTMLDivElement | null>(null);

  const fieldRefs: BudgetRequestFieldRefs = {
    budgetPlan: budgetPlanFieldRef,
    department: departmentFieldRef,
    project: projectFieldRef,
    subject: subjectFieldRef,
    description: descriptionFieldRef,
    notes: notesFieldRef,
    supportingDocs: supportingDocsFieldRef,
    months: monthsFieldRef,
    items: itemsFieldRef,
    approvalSchema: approvalSchemaFieldRef,
  };

  const taxSummary = useMemo(
    () => computeTaxSummary(lineItems, taxConfig),
    [lineItems, taxConfig],
  );

  const isBudgetPlanSelected = formData.budgetPlanId !== '';

  const handlePlanSelect = async (planId: string, plans: BudgetRequestPlanOption[]) => {
    const plan = plans.find((item) => item.id === planId);
    setFormData((previous) => applyPlanToFormValues(previous, plan, planId));

    if (!planId) return;

    const selectedPlan = await fetchBudgetPlanDetails(planId);
    if (!selectedPlan) return;

    setFormData((previous) => ({
      ...previous,
      fiscalYear: selectedPlan.fiscalYear ?? previous.fiscalYear,
      originOffice: selectedPlan.originOffice ?? previous.originOffice,
      departmentId: selectedPlan.departmentId ?? previous.departmentId,
      projectId: selectedPlan.projectId ?? previous.projectId,
      description:
        typeof selectedPlan.description === 'string'
          ? selectedPlan.description
          : (plan?.description ?? previous.description),
    }));
  };

  const getFieldRef = (field: BudgetRequestValidationField) => fieldRefs[field];

  return {
    formData,
    setFormData,
    selectedMonths,
    setSelectedMonths,
    lineItems,
    setLineItems,
    taxConfig,
    setTaxConfig,
    taxSummary,
    isBudgetPlanSelected,
    fieldRefs,
    getFieldRef,
    handlePlanSelect,
  };
}
