'use client';

import Link from 'next/link';
import { Edit, Trash, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from '@/components/ui/actions/ActionsDropdown';
import { iconActionButtonClassName } from '@/components/ui/actions/IconActionButton';

interface ProjectActionsProps {
  projectId: string;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function ProjectActions({ projectId, onDelete, canEdit, canDelete }: ProjectActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Delete this project?')) return false;
    try {
      const res = await fetch(`/api/workspace-management/project/${projectId}`, { method: 'DELETE' });
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
      <Link href={`/workspace-management/project/${projectId}`} className={iconActionButtonClassName}>
        <Eye className="w-4 h-4" />
      </Link>
      {(canEdit || canDelete) && (
        <ActionsDropdown
          triggerAriaLabel="Open project actions"
          actions={[
            ...(canEdit
              ? [
                  {
                    label: 'Edit',
                    icon: Edit,
                    onSelect: () => router.push(`/workspace-management/project/${projectId}/edit`),
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
