'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { Department } from '@/types/department';
import { stripHtmlTags } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import DepartmentActions from './components/DepartmentActions';

export default function DepartmentPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentDepartments = filteredDepartments.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/workspace-management/department');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const list = data.departments || [];
        setDepartments(list);
        setFilteredDepartments(list);
      } catch {
        setError('Failed to load data');
        setDepartments([]);
        setFilteredDepartments([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredDepartments(departments);
    } else {
      const kw = searchKeyword.trim().toLowerCase();
      setFilteredDepartments(
        departments.filter(
          (d) =>
            d.name?.toLowerCase().includes(kw) ||
            d.code?.toLowerCase().includes(kw) ||
            d.description?.toLowerCase().includes(kw) ||
            (d.head as { name?: string })?.name?.toLowerCase().includes(kw)
        )
      );
    }
    setCurrentPage(1);
  }, [searchKeyword, departments]);

  const refetch = async () => {
    const res = await fetch('/api/workspace-management/department');
    const data = await res.json();
    const list = data.departments || [];
    setDepartments(list);
    setFilteredDepartments(list);
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Department</h1>
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-80">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-full border border-gray-400 rounded-lg focus:outline-none focus:border-blue-500 transition-all duration-300"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
        <Link
          href="/workspace-management/department/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </Link>
      </div>

      {error && <div className="text-red-500 py-4">{error}</div>}

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-400">
              <th className="text-left py-3 px-4">#</th>
              <th className="text-left py-3 px-4">Code</th>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Description</th>
              <th className="text-left py-3 px-4">Head</th>
              <th className="text-left py-3 px-4 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {currentDepartments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  {searchKeyword.trim() ? 'No matches' : 'No departments'}
                </td>
              </tr>
            ) : (
              currentDepartments.map((dept, i) => (
                <tr key={dept.id} className="border-b border-gray-400 hover:bg-gray-50">
                  <td className="py-3 px-4">{startIndex + i + 1}</td>
                  <td className="py-3 px-4">{dept.code}</td>
                  <td className="py-3 px-4">{dept.name}</td>
                  <td className="py-3 px-4">{stripHtmlTags(dept.description)}</td>
                  <td className="py-3 px-4">{(dept.head as { name?: string })?.name ?? '-'}</td>
                  <td className="py-3 px-4">
                    <DepartmentActions departmentId={dept.id} onDelete={refetch} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
      <Pagination
        currentPage={currentPage}
        totalItems={filteredDepartments.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
