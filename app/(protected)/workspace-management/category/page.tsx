'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';
import CategoryActions from './components/CategoryActions';
import { canShowMasterCrud, isSyncManagedMaster } from '@/lib/workspace-master-ui-policy';

type Category = { id: string; name: string; description: string | null };

export default function CategoryPage() {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;
  const isSyncManaged = isSyncManagedMaster('category');
  const canCreateCategory = canShowMasterCrud(
    'category',
    Boolean(session?.user?.access?.activityAccess?.createCategory)
  );
  const canEditCategory = canShowMasterCrud(
    'category',
    Boolean(session?.user?.access?.activityAccess?.editCategory)
  );
  const canDeleteCategory = canShowMasterCrud(
    'category',
    Boolean(session?.user?.access?.activityAccess?.deleteCategory)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCategories = filteredCategories.slice(startIndex, startIndex + itemsPerPage);

  const refetch = async () => {
    const res = await fetch('/api/workspace-management/category');
    const data = await res.json();
    const list = data.categories || [];
    setCategories(list);
    setFilteredCategories(list);
  };

  useEffect(() => {
    refetch().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredCategories(categories);
    } else {
      const kw = searchKeyword.toLowerCase();
      setFilteredCategories(
        categories.filter((category) =>
          `${category.name} ${category.description ?? ''}`.toLowerCase().includes(kw)
        )
      );
    }
    setCurrentPage(1);
  }, [searchKeyword, categories]);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Category Master</h1>
      {isSyncManaged && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Category dikelola melalui sinkronisasi. Kontrol tambah/ubah/hapus disembunyikan.
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <SearchInput value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
        {canCreateCategory && (
          <Link href="/workspace-management/category/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Add Category
          </Link>
        )}
      </div>

      <Card>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-16" />
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentCategories.length === 0 ? (
              <TableEmptyRow colSpan={4}>{searchKeyword.trim() ? 'No matches' : 'No categories'}</TableEmptyRow>
            ) : (
              currentCategories.map((category, idx) => (
                <TableBodyRow key={category.id}>
                  <TableCell>{startIndex + idx + 1}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.description || '-'}</TableCell>
                  <TableCell>
                    <CategoryActions
                      categoryId={category.id}
                      onDelete={refetch}
                      canEdit={canEditCategory}
                      canDelete={canDeleteCategory}
                    />
                  </TableCell>
                </TableBodyRow>
              ))
            )}
          </tbody>
        </Table>
      </Card>
      <Pagination currentPage={currentPage} totalItems={filteredCategories.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
}
