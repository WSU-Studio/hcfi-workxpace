import { schemaLevelPicNames } from '@/lib/approval-schema';

export type ApprovalEscalationRoleLabelProps = {
  roleName?: string | null;
  pics?: Array<{ user?: { name: string } | null }>;
};

/**
 * Role name for an approval-escalation row. When the schema level has Specific
 * PICs, their names render underneath in smaller gray text.
 */
export default function ApprovalEscalationRoleLabel({
  roleName,
  pics,
}: ApprovalEscalationRoleLabelProps) {
  const picNames = schemaLevelPicNames(pics);
  return (
    <div>
      <p>{roleName?.trim() || '-'}</p>
      {picNames.length > 0 ? (
        <p className="mt-0.5 text-xs leading-snug text-gray-500">{picNames.join(', ')}</p>
      ) : null}
    </div>
  );
}
