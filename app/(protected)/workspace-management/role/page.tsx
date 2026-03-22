'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import RoleActions from './components/RoleActions';

interface Role {
  id: string;
  roleCode: string;
  roleName: string;
  description: string | null;
}

export default function RolePage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [filtered, setFiltered] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRoles = filtered.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    fetch('/api/workspace-management/role')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRoles(list);
        setFiltered(list);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) setFiltered(roles);
    else {
      const kw = searchKeyword.toLowerCase();
      setFiltered(roles.filter((r) => r.roleName?.toLowerCase().includes(kw) || r.roleCode?.toLowerCase().includes(kw)));
    }
    setCurrentPage(1);
  }, [searchKeyword, roles]);

  const refetch = () => {
    fetch('/api/workspace-management/role')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setRoles(Array.isArray(data) ? data : []);
        setFiltered(Array.isArray(data) ? data : []);
      });
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Role (Job Position)</h1>
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
          href="/workspace-management/role/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Role
        </Link>
      </div>
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">#</th>
              <th className="text-left py-3 px-4">Code</th>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Description</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {currentRoles.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  No roles
                </td>
              </tr>
            ) : (
              currentRoles.map((r, i) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{startIndex + i + 1}</td>
                  <td className="py-3 px-4">{r.roleCode}</td>
                  <td className="py-3 px-4">{r.roleName}</td>
                  <td className="py-3 px-4">{r.description || '-'}</td>
                  <td className="py-3 px-4">
                    <RoleActions roleId={r.id} onDelete={refetch} />
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
