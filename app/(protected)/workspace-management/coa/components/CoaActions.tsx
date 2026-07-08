'use client';

import Link from 'next/link';
import { Edit, Trash, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from '@/components/ui/actions/ActionsDropdown';
import { iconActionButtonClassName } from '@/components/ui/actions/IconActionButton';

interface CoaActionsProps {
  coaId: string;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function CoaActions({ coaId, onDelete, canEdit, canDelete }: CoaActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Delete this COA?')) return false;
    try {
      const response = await fetch(`/api/workspace-management/coa/${coaId}`, { method: 'DELETE' });
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
      <Link href={`/workspace-management/coa/${coaId}`} className={iconActionButtonClassName}>
        <Eye className="w-4 h-4" />
      </Link>
      {(canEdit || canDelete) && (
        <ActionsDropdown
          triggerAriaLabel="Open COA actions"
          actions={[
            ...(canEdit
              ? [
                  {
                    label: 'Edit',
                    icon: Edit,
                    onSelect: () => router.push(`/workspace-management/coa/${coaId}/edit`),
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
