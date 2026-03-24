'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

type Category = { id: string; name: string; description: string | null };

export default function CategoryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/category/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCategory(data.category))
      .catch(() => setCategory(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!category) return <div className="text-red-500">Category not found</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/workspace-management/category" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <h1 className="text-2xl font-semibold">Category Detail</h1>
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <p className="font-medium">{category.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Description</label>
          <p className="text-gray-700">{category.description || '-'}</p>
        </div>
        <div className="pt-4">
          <Link href={`/workspace-management/category/${id}/edit`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Edit
          </Link>
        </div>
      </Card>
    </div>
  );
}
