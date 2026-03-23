'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { MoreVertical, Edit, Trash, Eye } from 'lucide-react';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';

interface DepartmentActionsProps {
  departmentId: string;
  onDelete: () => void;
}

export default function DepartmentActions({ departmentId, onDelete }: DepartmentActionsProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useOnClickOutside(dropdownRef, () => setShowDropdown(false));

  const handleDelete = async () => {
    if (!confirm('Delete this department?')) return;
    try {
      const res = await fetch(`/api/workspace-management/department/${departmentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed');
        return;
      }
      onDelete();
      setShowDropdown(false);
    } catch {
      alert('Failed to delete');
    }
  };

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      <Link
        href={`/workspace-management/department/${departmentId}`}
        className="p-1 hover:text-blue-600 rounded"
      >
        <Eye className="w-4 h-4" />
      </Link>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-1 rounded cursor-pointer"
      >
        <MoreVertical className="w-4 h-4 hover:text-blue-600" />
      </button>
      {showDropdown && (
        <Card className="absolute right-8 top-0 !p-2">
          <button
            onClick={() => {
              router.push(`/workspace-management/department/${departmentId}/edit`);
              setShowDropdown(false);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600 flex items-center gap-2 cursor-pointer"
          >
            <Trash className="w-4 h-4" />
            Delete
          </button>
        </Card>
      )}
    </div>
  );
}
