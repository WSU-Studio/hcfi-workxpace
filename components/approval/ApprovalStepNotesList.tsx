import type { ApprovalStepProgress } from '@/lib/budget-plan-approval-display';

export interface ApprovalStepNotesListProps {
  levels: { role?: { roleName: string } | null }[];
  stepProgresses: ApprovalStepProgress[];
  className?: string;
}

export default function ApprovalStepNotesList({
  levels,
  stepProgresses,
  className = '',
}: ApprovalStepNotesListProps) {
  const items = levels
    .map((level, index) => {
      const progress = stepProgresses[index];
      const note = progress?.note?.trim();
      if (!note) return null;

      const roleName = level.role?.roleName?.trim() || 'Unknown role';
      const actorName = progress?.actorName?.trim();

      return {
        key: `${roleName}-${index}`,
        roleName,
        actorName,
        note,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) return null;

  return (
    <div className={`space-y-3 border-t border-gray-100 pt-4 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700">Approval Notes</h4>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="font-medium text-gray-900">
              {item.roleName}
              {item.actorName ? (
                <span className="font-normal text-gray-500"> · {item.actorName}</span>
              ) : null}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{item.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
