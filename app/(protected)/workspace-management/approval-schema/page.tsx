'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SchemaActions from './components/SchemaActions';

interface Level {
  stepOrder: number;
  levelType: string;
  role: { roleName: string };
}

interface Schema {
  id: string;
  name: string;
  type: string;
  period: string;
  department: { name: string };
  approvalLevels: Level[];
}

export default function ApprovalSchemaPage() {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [filtered, setFiltered] = useState<Schema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSchemas = filtered.slice(startIndex, startIndex + itemsPerPage);

  const fetchData = async () => {
    const res = await fetch('/api/workspace-management/approval-schema');
    const data = await res.json();
    const list = data.schemas || [];
    setSchemas(list);
    setFiltered(list);
  };

  useEffect(() => {
    fetchData().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) setFiltered(schemas);
    else {
      const kw = searchKeyword.toLowerCase();
      setFiltered(schemas.filter((s) => s.name?.toLowerCase().includes(kw) || s.type?.toLowerCase().includes(kw) || s.department?.name?.toLowerCase().includes(kw)));
    }
    setCurrentPage(1);
  }, [searchKeyword, schemas]);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Approval Scheme Management</h1>
      <div className="flex justify-between gap-4">
        <div className="relative w-80">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-600"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
        <Link
          href="/workspace-management/approval-schema/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Approval Scheme
        </Link>
      </div>
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">#</th>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Department</th>
              <th className="text-left py-3 px-4">Status / Type</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {currentSchemas.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  No approval schemes
                </td>
              </tr>
            ) : (
              currentSchemas.map((s, i) => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{startIndex + i + 1}</td>
                  <td className="py-3 px-4">{s.name}</td>
                  <td className="py-3 px-4">{s.department?.name ?? '-'}</td>
                  <td className="py-3 px-4">{s.type} - Default</td>
                  <td className="py-3 px-4">
                    <SchemaActions schemaId={s.id} onDelete={fetchData} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
}
