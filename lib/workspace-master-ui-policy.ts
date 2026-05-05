const ALL_MASTER_MODULES = [
  'department',
  'origin-office',
  'cost-center',
  'category',
  'category-key-index',
  'project',
  'role',
  'approval-schema',
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
 * Marks modules whose CRUD controls should be hidden in UI.
 * Data + APIs stay available so controls can be re-enabled later.
 *
 * Example:
 * NEXT_PUBLIC_SYNC_MANAGED_MASTERS=department,cost-center
 */
const managedModules = parseManagedModules();

export const isSyncManagedMaster = (moduleName: WorkspaceMasterModule): boolean =>
  managedModules.has(moduleName);

export const canShowMasterCrud = (
  moduleName: WorkspaceMasterModule,
  hasPermission: boolean
): boolean => hasPermission && !isSyncManagedMaster(moduleName);
