'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SchemaActions from './components/SchemaActions';
import SearchInput from '@/components/ui/SearchInput';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';

interface Level {
  stepOrder: number;
  levelType: string;
  role: { roleName: string };
}

interface Schema {
  id: string;
  code: string;
  name: string;
  type: string;
  period: string;
  department: { name: string };
  approvalLevels: Level[];
}

export default function ApprovalSchemaPage() {
  const { data: session } = useSession();
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [filtered, setFiltered] = useState<Schema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const itemsPerPage = 10;
  const canCreateApprovalSchema = Boolean(session?.user?.access?.activityAccess?.createApprovalSchema);
  const canEditApprovalSchema = Boolean(session?.user?.access?.activityAccess?.editApprovalSchema);
  const canDeleteApprovalSchema = Boolean(session?.user?.access?.activityAccess?.deleteApprovalSchema);
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
      setFiltered(
        schemas.filter(
          (s) =>
            s.code?.toLowerCase().includes(kw) ||
            s.name?.toLowerCase().includes(kw) ||
            s.type?.toLowerCase().includes(kw) ||
            s.department?.name?.toLowerCase().includes(kw),
        ),
      );
    }
    setCurrentPage(1);
  }, [searchKeyword, schemas]);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Approval Schema Management</h1>
      <div className="flex justify-between gap-4">
        <SearchInput 
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
        {canCreateApprovalSchema && (
          <Link
            href="/workspace-management/approval-schema/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Approval Schema
          </Link>
        )}
      </div>
      <Card>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>#</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status / Type</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentSchemas.length === 0 ? (
              <TableEmptyRow colSpan={6}>{searchKeyword.trim() ? 'No matches' : 'No approval schemas'}</TableEmptyRow>
            ) : (
              currentSchemas.map((s, i) => (
                <TableBodyRow key={s.id}>
                  <TableCell>{startIndex + i + 1}</TableCell>
                  <TableCell className="font-mono text-sm">{s.code}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.department?.name ?? '-'}</TableCell>
                  <TableCell>{s.type} - Default</TableCell>
                  <TableCell>
                    <SchemaActions
                      schemaId={s.id}
                      onDelete={fetchData}
                      canEdit={canEditApprovalSchema}
                      canDelete={canDeleteApprovalSchema}
                    />
                  </TableCell>
                </TableBodyRow>
              ))
            )}
          </tbody>
        </Table>
      </Card>
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
}
