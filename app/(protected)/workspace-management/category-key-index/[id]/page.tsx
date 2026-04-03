'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

type CategoryKeyIndex = { id: string; name: string; description: string | null };

export default function CategoryKeyIndexDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [categoryKeyIndex, setCategoryKeyIndex] = useState<CategoryKeyIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/category-key-index/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCategoryKeyIndex(data.categoryKeyIndex))
      .catch(() => setCategoryKeyIndex(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!categoryKeyIndex) return <div className="text-red-500">Category key index not found</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/workspace-management/category-key-index" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <h1 className="text-2xl font-semibold">Category Key Index Detail</h1>
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <p className="font-medium">{categoryKeyIndex.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Description</label>
          <p className="text-gray-700">{categoryKeyIndex.description || '-'}</p>
        </div>
        <div className="pt-4">
          <Link href={`/workspace-management/category-key-index/${id}/edit`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Edit
          </Link>
        </div>
      </Card>
    </div>
  );
}
