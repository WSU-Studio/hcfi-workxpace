'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';
import CostCenterActions from './components/CostCenterActions';

type CostCenter = { id: string; name: string; description: string | null };

export default function CostCenterPage() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [filteredCostCenters, setFilteredCostCenters] = useState<CostCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCostCenters = filteredCostCenters.slice(startIndex, startIndex + itemsPerPage);

  const refetch = async () => {
    const res = await fetch('/api/workspace-management/cost-center');
    const data = await res.json();
    const list = data.costCenters || [];
    setCostCenters(list);
    setFilteredCostCenters(list);
  };

  useEffect(() => {
    refetch().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredCostCenters(costCenters);
    } else {
      const kw = searchKeyword.toLowerCase();
      setFilteredCostCenters(
        costCenters.filter((costCenter) =>
          `${costCenter.name} ${costCenter.description ?? ''}`.toLowerCase().includes(kw)
        )
      );
    }
    setCurrentPage(1);
  }, [searchKeyword, costCenters]);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cost Center Master</h1>
      <div className="flex items-center justify-between gap-4">
        <SearchInput value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
        <Link href="/workspace-management/cost-center/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Add Cost Center
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
            {currentCostCenters.length === 0 ? (
              <TableEmptyRow colSpan={4}>{searchKeyword.trim() ? 'No matches' : 'No cost centers'}</TableEmptyRow>
            ) : (
              currentCostCenters.map((costCenter, idx) => (
                <TableBodyRow key={costCenter.id}>
                  <TableCell>{startIndex + idx + 1}</TableCell>
                  <TableCell>{costCenter.name}</TableCell>
                  <TableCell>{costCenter.description || '-'}</TableCell>
                  <TableCell><CostCenterActions costCenterId={costCenter.id} onDelete={refetch} /></TableCell>
                </TableBodyRow>
              ))
            )}
          </tbody>
        </Table>
      </Card>
      <Pagination currentPage={currentPage} totalItems={filteredCostCenters.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
}
