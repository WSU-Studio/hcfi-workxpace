'use client';

import Link from 'next/link';
import { Edit, Trash, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from '@/components/ui/actions/ActionsDropdown';
import { iconActionButtonClassName } from '@/components/ui/actions/IconActionButton';

interface DivisionActionsProps {
  divisionId: string;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function DivisionActions({ divisionId, onDelete, canEdit, canDelete }: DivisionActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Delete this division? Departments will be unassigned (not deleted).')) return false;
    try {
      const res = await fetch(`/api/workspace-management/division/${divisionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed');
        return false;
      }
      onDelete();
      return true;
    } catch {
      alert('Failed to delete');
      return false;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Link href={`/workspace-management/division/${divisionId}`} className={iconActionButtonClassName}>
        <Eye className="w-4 h-4" />
      </Link>
      {(canEdit || canDelete) && (
        <ActionsDropdown
          triggerAriaLabel="Open division actions"
          actions={[
            ...(canEdit
              ? [
                  {
                    label: 'Edit',
                    icon: Edit,
                    onSelect: () => router.push(`/workspace-management/division/${divisionId}/edit`),
                  },
                ]
              : []),
            ...(canDelete
              ? [
                  {
                    label: 'Delete',
                    icon: Trash,
                    variant: 'danger' as const,
                    onSelect: handleDelete,
                  },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}
