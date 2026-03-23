'use client';

import { useState, useRef } from 'react';
import { MoreVertical, Edit, Trash } from 'lucide-react';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';

interface RoleActionsProps {
  roleId: string;
  onDelete: () => void;
}

export default function RoleActions({ roleId, onDelete }: RoleActionsProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useOnClickOutside(ref, () => setShow(false));

  const handleDelete = async () => {
    if (!confirm('Delete this role?')) return;
    const res = await fetch(`/api/workspace-management/role/${roleId}`, { method: 'DELETE' });
    if (res.ok) {
      onDelete();
      setShow(false);
    } else {
      const d = await res.json();
      alert(d.error ?? 'Failed');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setShow(!show)} className="p-1 rounded cursor-pointer">
        <MoreVertical className="w-4 h-4 hover:text-blue-600" />
      </button>
      {show && (
        <Card className="absolute right-8 top-0 !p-2">
          <button
            onClick={() => { router.push(`/workspace-management/role/${roleId}/edit`); setShow(false); }}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600 flex items-center gap-2"
          >
            <Trash className="w-4 h-4" />
            Delete
          </button>
        </Card>
      )}
    </div>
  );
}
