/**
 * Tenant-specific UI toggles. Default app behaviour is unchanged unless env
 * explicitly opts into a deployment customisation.
 */

function normalizeTenant(value?: string): string {
  return value?.trim().toLowerCase() ?? '';
}

/**
 * Hyundai compact Budget Request detail: approval grid + subject/description
 * on the main page; full metadata & line items in a Detail modal.
 *
 * Enable via either:
 *   NEXT_PUBLIC_BR_DETAIL_COMPACT_VIEW=true
 *   NEXT_PUBLIC_DEPLOYMENT_TENANT=hyundaicapital
 */
export function isBudgetRequestCompactDetailView(): boolean {
  if (process.env.NEXT_PUBLIC_BR_DETAIL_COMPACT_VIEW === 'true') return true;
  const tenant = normalizeTenant(process.env.NEXT_PUBLIC_DEPLOYMENT_TENANT);
  return tenant === 'hyundaicapital' || tenant === 'hyundai';
}
