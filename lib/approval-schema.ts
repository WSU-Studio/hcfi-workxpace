export interface ApprovalLevelOption {
  stepOrder: number;
  levelType: string;
  role?: { roleName: string } | null;
}

export interface ApprovalSchemaOption {
  id: string;
  name: string;
  departmentId: string;
  approvalLevels?: ApprovalLevelOption[];
}

export function sortApprovalLevels(levels: ApprovalLevelOption[]): ApprovalLevelOption[] {
  return [...levels].sort((a, b) => a.stepOrder - b.stepOrder);
}
