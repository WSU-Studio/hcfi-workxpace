const HYUNDAI_TENANT = 'hyundaicapital';

const normalizeTenant = (value?: string): string => value?.trim().toLowerCase() ?? '';

/**
 * Identifies which company/deployment this Workxpace instance serves.
 * Set via NEXT_PUBLIC_DEPLOYMENT_TENANT at build time (e.g. `hyundaicapital`).
 */
export const deploymentTenant = normalizeTenant(process.env.NEXT_PUBLIC_DEPLOYMENT_TENANT);

export const isHyundaiDeployment = (): boolean => deploymentTenant === HYUNDAI_TENANT;

/** Confins employee sync (manual UI + API) — enabled for Hyundai/HCFI deployments only. */
export const isConfinsEmployeeSyncEnabled = (): boolean => isHyundaiDeployment();
