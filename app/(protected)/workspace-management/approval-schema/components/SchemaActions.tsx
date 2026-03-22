'use client';

import { useState, useRef } from 'react';
import { MoreVertical, Edit, Trash } from 'lucide-react';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { useRouter } from 'next/navigation';

interface SchemaActionsProps {
  schemaId: string;
  onDelete: () => void;
}

export default function SchemaActions({ schemaId, onDelete }: SchemaActionsProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useOnClickOutside(ref, () => setShow(false));

  const handleDelete = async () => {
    if (!confirm('Delete this approval scheme?')) return;
    const res = await fetch(`/api/workspace-management/approval-schema/${schemaId}`, { method: 'DELETE' });
    if (res.ok) {
      onDelete();
      setShow(false);
    } else {
      alert('Failed to delete');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setShow(!show)} className="p-1 hover:text-blue-600 rounded">
        <MoreVertical className="w-4 h-4" />
      </button>
      {show && (
        <div className="absolute right-0 top-8 bg-white shadow-lg rounded-lg py-2 min-w-[100px] z-10 border">
          <button
            onClick={() => { router.push(`/workspace-management/approval-schema/${schemaId}/edit`); setShow(false); }}
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
        </div>
      )}
    </div>
  );
}
