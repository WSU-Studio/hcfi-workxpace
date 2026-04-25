'use client';

import Link from 'next/link';
import { Edit, Trash, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from '@/components/ui/actions/ActionsDropdown';
import { iconActionButtonClassName } from '@/components/ui/actions/IconActionButton';

interface OriginOfficeActionsProps {
  originOfficeId: string;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function OriginOfficeActions({
  originOfficeId,
  onDelete,
  canEdit,
  canDelete,
}: OriginOfficeActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Delete this origin office?')) return false;
    try {
      const response = await fetch(`/api/workspace-management/origin-office/${originOfficeId}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (!response.ok) {
        alert(payload.error ?? 'Failed');
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
      <Link
        href={`/workspace-management/origin-office/${originOfficeId}`}
        className={iconActionButtonClassName}
      >
        <Eye className="w-4 h-4" />
      </Link>
      {(canEdit || canDelete) && (
        <ActionsDropdown
          triggerAriaLabel="Open origin office actions"
          actions={[
            ...(canEdit
              ? [
                  {
                    label: 'Edit',
                    icon: Edit,
                    onSelect: () =>
                      router.push(`/workspace-management/origin-office/${originOfficeId}/edit`),
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
