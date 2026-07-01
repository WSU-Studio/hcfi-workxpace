export function resolveBudgetRequestOriginOfficeCode(input: {
  originOffice?: string | null;
  budgetPlan?: { originOffice?: string | null } | null;
}): string | null {
  const code = input.originOffice ?? input.budgetPlan?.originOffice ?? null;
  return code && code.trim().length > 0 ? code.trim() : null;
}

export function resolveBudgetRequestProjectName(input: {
  project?: { name?: string | null } | null;
  budgetPlan?: { project?: { name?: string | null } | null } | null;
}): string | null {
  const name = input.project?.name ?? input.budgetPlan?.project?.name ?? null;
  return name && name.trim().length > 0 ? name.trim() : null;
}

export function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function formatBudgetRequestOriginOfficeLabel(
  input: {
    originOffice?: string | null;
    budgetPlan?: { originOffice?: string | null } | null;
  },
  originOffices?: { code: string; name: string }[],
): string {
  const officeCode = resolveBudgetRequestOriginOfficeCode(input);
  if (!officeCode) return '-';
  const office = originOffices?.find((item) => item.code === officeCode);
  return office ? `${office.code} - ${office.name}` : officeCode;
}
