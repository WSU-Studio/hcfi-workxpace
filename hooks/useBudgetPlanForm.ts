'use client';

import { useMemo, useRef, useState } from 'react';
import {
  BudgetPlanFormValues,
  BudgetPlanValidationField,
  createDefaultFormValues,
  createEmptyAllocations,
  formatAllocationDisplay,
  parseBaseAmount,
} from '@/lib/budget-plans/form';

export interface BudgetPlanFieldRefs {
  fiscalYear: React.RefObject<HTMLDivElement | null>;
  originOffice: React.RefObject<HTMLDivElement | null>;
  department: React.RefObject<HTMLDivElement | null>;
  project: React.RefObject<HTMLDivElement | null>;
  subject: React.RefObject<HTMLDivElement | null>;
  description: React.RefObject<HTMLDivElement | null>;
  approvalSchema: React.RefObject<HTMLDivElement | null>;
  months: React.RefObject<HTMLDivElement | null>;
  allocations: React.RefObject<HTMLDivElement | null>;
}

export function useBudgetPlanForm(initialValues?: Partial<BudgetPlanFormValues>) {
  const [formData, setFormData] = useState<BudgetPlanFormValues>({
    ...createDefaultFormValues(),
    ...initialValues,
  });
  const [allocations, setAllocations] = useState<Record<number, number>>(createEmptyAllocations);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const [baseAmount, setBaseAmount] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [existingSupportingDocs, setExistingSupportingDocs] = useState<string[]>([]);

  const fiscalYearFieldRef = useRef<HTMLDivElement | null>(null);
  const originOfficeFieldRef = useRef<HTMLDivElement | null>(null);
  const departmentFieldRef = useRef<HTMLDivElement | null>(null);
  const projectFieldRef = useRef<HTMLDivElement | null>(null);
  const subjectFieldRef = useRef<HTMLDivElement | null>(null);
  const descriptionFieldRef = useRef<HTMLDivElement | null>(null);
  const approvalSchemaFieldRef = useRef<HTMLDivElement | null>(null);
  const monthsFieldRef = useRef<HTMLDivElement | null>(null);
  const allocationsFieldRef = useRef<HTMLDivElement | null>(null);

  const fieldRefs: BudgetPlanFieldRefs = {
    fiscalYear: fiscalYearFieldRef,
    originOffice: originOfficeFieldRef,
    department: departmentFieldRef,
    project: projectFieldRef,
    subject: subjectFieldRef,
    description: descriptionFieldRef,
    approvalSchema: approvalSchemaFieldRef,
    months: monthsFieldRef,
    allocations: allocationsFieldRef,
  };

  const selectedMonthsSorted = useMemo(
    () => [...selectedMonths].sort((a, b) => a - b),
    [selectedMonths],
  );

  const totalAllocation = useMemo(
    () => selectedMonthsSorted.reduce((sum, month) => sum + (allocations[month] || 0), 0),
    [allocations, selectedMonthsSorted],
  );

  const copyToAll = () => {
    if (selectedMonthsSorted.length === 0) return;
    const value = parseBaseAmount(baseAmount);
    const next = { ...allocations };
    selectedMonthsSorted.forEach((month) => {
      next[month] = value;
    });
    setAllocations(next);
  };

  const splitEvenly = () => {
    if (selectedMonthsSorted.length === 0) return;
    const total = parseBaseAmount(baseAmount) || totalAllocation;
    if (!total) return;
    const each = Math.round((total / selectedMonthsSorted.length) * 100) / 100;
    const next = { ...allocations };
    selectedMonthsSorted.forEach((month) => {
      next[month] = each;
    });
    setAllocations(next);
  };

  const removeExistingSupportingDoc = (url: string) => {
    setExistingSupportingDocs((previous) => previous.filter((item) => item !== url));
  };

  const getFieldRef = (field: BudgetPlanValidationField) => fieldRefs[field];

  return {
    formData,
    setFormData,
    allocations,
    setAllocations,
    selectedMonths,
    setSelectedMonths,
    selectedMonthsSorted,
    baseAmount,
    setBaseAmount,
    attachmentFiles,
    setAttachmentFiles,
    existingSupportingDocs,
    setExistingSupportingDocs,
    totalAllocation,
    copyToAll,
    splitEvenly,
    removeExistingSupportingDoc,
    formatAllocationDisplay,
    fieldRefs,
    getFieldRef,
  };
}
