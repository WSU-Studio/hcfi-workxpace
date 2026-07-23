const ALL_MASTER_MODULES = [
  'department',
  'origin-office',
  'cost-center',
  'category',
  'category-key-index',
  'project',
  'role',
  'approval-schema',
  'coa',
] as const;

export type WorkspaceMasterModule = (typeof ALL_MASTER_MODULES)[number];

const normalizeToken = (value: string) => value.trim().toLowerCase();

const parseCsvEnv = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map(normalizeToken)
    .filter(Boolean);
};

const parseManagedModules = (): Set<string> => {
  const rawValue = process.env.NEXT_PUBLIC_SYNC_MANAGED_MASTERS;
  const tokens = parseCsvEnv(rawValue);
  if (tokens.includes('all')) {
    return new Set<string>(ALL_MASTER_MODULES);
  }
  return new Set<string>(tokens);
};

/**
 * Marks modules whose create/delete (and usually full edit) controls are hidden in UI.
 * Data + APIs stay available so controls can be re-enabled later.
 *
 * Example:
 * NEXT_PUBLIC_SYNC_MANAGED_MASTERS=department,cost-center
 */
const managedModules = parseManagedModules();

/**
 * Sync-managed masters that still allow editing local enrichment fields
 * (e.g. department: division, description, head) while locking Confins identity (code/name).
 */
const PARTIAL_EDIT_SYNC_MASTERS = ['department'] as const satisfies readonly WorkspaceMasterModule[];

export const isSyncManagedMaster = (moduleName: WorkspaceMasterModule): boolean =>
  managedModules.has(moduleName);

/** True when Confins owns code/name for this module (UI + API should not change them). */
export const areConfinsIdentityFieldsLocked = (moduleName: WorkspaceMasterModule): boolean =>
  isSyncManagedMaster(moduleName) &&
  (PARTIAL_EDIT_SYNC_MASTERS as readonly string[]).includes(moduleName);

/**
 * Full CRUD (create / edit / delete) — hidden when the master is sync-managed.
 * Prefer {@link canShowMasterEdit} for modules that support partial edit under sync.
 */
export const canShowMasterCrud = (
  moduleName: WorkspaceMasterModule,
  hasPermission: boolean
): boolean => hasPermission && !isSyncManagedMaster(moduleName);

/**
 * Edit action visibility. Sync-managed masters in PARTIAL_EDIT_SYNC_MASTERS
 * still show Edit when the user has permission.
 */
export const canShowMasterEdit = (
  moduleName: WorkspaceMasterModule,
  hasPermission: boolean
): boolean => {
  if (!hasPermission) return false;
  if (!isSyncManagedMaster(moduleName)) return true;
  return (PARTIAL_EDIT_SYNC_MASTERS as readonly string[]).includes(moduleName);
};
