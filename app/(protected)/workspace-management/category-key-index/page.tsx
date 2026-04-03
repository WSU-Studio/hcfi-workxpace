'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';
import CategoryKeyIndexActions from './components/CategoryKeyIndexActions';

type CategoryKeyIndex = { id: string; name: string; description: string | null };

export default function CategoryKeyIndexPage() {
  const [categoryKeyIndexes, setCategoryKeyIndexes] = useState<CategoryKeyIndex[]>([]);
  const [filteredCategoryKeyIndexes, setFilteredCategoryKeyIndexes] = useState<CategoryKeyIndex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCategoryKeyIndexes = filteredCategoryKeyIndexes.slice(startIndex, startIndex + itemsPerPage);

  const refetch = async () => {
    const res = await fetch('/api/workspace-management/category-key-index');
    const data = await res.json();
    const list = data.categoryKeyIndexes || [];
    setCategoryKeyIndexes(list);
    setFilteredCategoryKeyIndexes(list);
  };

  useEffect(() => {
    refetch().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredCategoryKeyIndexes(categoryKeyIndexes);
    } else {
      const kw = searchKeyword.toLowerCase();
      setFilteredCategoryKeyIndexes(
        categoryKeyIndexes.filter((item) => `${item.name} ${item.description ?? ''}`.toLowerCase().includes(kw))
      );
    }
    setCurrentPage(1);
  }, [searchKeyword, categoryKeyIndexes]);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Category Key Index Master</h1>
      <div className="flex items-center justify-between gap-4">
        <SearchInput value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
        <Link href="/workspace-management/category-key-index/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Add Category Key Index
        </Link>
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
            {currentCategoryKeyIndexes.length === 0 ? (
              <TableEmptyRow colSpan={4}>{searchKeyword.trim() ? 'No matches' : 'No category key indexes'}</TableEmptyRow>
            ) : (
              currentCategoryKeyIndexes.map((item, idx) => (
                <TableBodyRow key={item.id}>
                  <TableCell>{startIndex + idx + 1}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.description || '-'}</TableCell>
                  <TableCell><CategoryKeyIndexActions categoryKeyIndexId={item.id} onDelete={refetch} /></TableCell>
                </TableBodyRow>
              ))
            )}
          </tbody>
        </Table>
      </Card>
      <Pagination currentPage={currentPage} totalItems={filteredCategoryKeyIndexes.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
}
