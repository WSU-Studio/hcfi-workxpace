export interface ApprovalLevelOption {
  stepOrder: number;
  levelType: string;
  role?: { roleName: string } | null;
  pics?: Array<{ user?: { id: string; name: string } | null }>;
}

export interface ApprovalSchemaOption {
  id: string;
  name: string;
  departmentId: string | null;
  approvalLevels?: ApprovalLevelOption[];
}

/** Form/API sentinel for a schema that applies to every department. */
export const ALL_DEPARTMENTS_VALUE = '__all__';
export const ALL_DEPARTMENTS_LABEL = 'All Department';

export function isAllDepartmentsSchema(
  departmentId: string | null | undefined,
): boolean {
  return departmentId == null || departmentId === ALL_DEPARTMENTS_VALUE;
}

export function schemaAppliesToDepartment(
  schemaDepartmentId: string | null | undefined,
  departmentId: string,
): boolean {
  if (!departmentId) return false;
  return isAllDepartmentsSchema(schemaDepartmentId) || schemaDepartmentId === departmentId;
}

export function filterSchemasForDepartment<T extends { departmentId?: string | null }>(
  schemas: T[],
  departmentId: string,
): T[] {
  return schemas.filter((schema) =>
    schemaAppliesToDepartment(schema.departmentId, departmentId),
  );
}

export function toSchemaDepartmentFormValue(
  departmentId: string | null | undefined,
): string {
  return departmentId ?? ALL_DEPARTMENTS_VALUE;
}

export type ParsedSchemaDepartmentId =
  | { ok: true; departmentId: string | null }
  | { ok: false; error: string };

export function parseSchemaDepartmentId(raw: unknown): ParsedSchemaDepartmentId {
  if (raw === ALL_DEPARTMENTS_VALUE || raw === null) {
    return { ok: true, departmentId: null };
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    return { ok: true, departmentId: raw.trim() };
  }
  return { ok: false, error: 'Select department' };
}

export function schemaDepartmentDisplayName(
  department: { name: string } | null | undefined,
): string {
  return department?.name ?? ALL_DEPARTMENTS_LABEL;
}

export function sortApprovalLevels(levels: ApprovalLevelOption[]): ApprovalLevelOption[] {
  return [...levels].sort((a, b) => a.stepOrder - b.stepOrder);
}

export const ALL_IN_ROLE_LABEL = 'All in role';

export function schemaLevelPicDisplayName(
  pics: Array<{ user?: { name: string } | null }> | undefined,
): string {
  const names = (pics ?? [])
    .map((pic) => pic.user?.name?.trim())
    .filter((name): name is string => Boolean(name));
  if (names.length === 0) return ALL_IN_ROLE_LABEL;
  return names.join(', ');
}
