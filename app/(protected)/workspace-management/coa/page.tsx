'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import SearchInput from '@/components/ui/SearchInput';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Pagination from '@/components/Pagination';
import {
  Table,
  TableBodyRow,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderRow,
} from '@/components/ui/Table';
import CoaActions from './components/CoaActions';
import type { Coa } from '@/types/coa';
import { canShowMasterCrud } from '@/lib/workspace-master-ui-policy';
import MasterSyncBanner from '@/components/workspace-management/MasterSyncBanner';

type SyncSummary = {
  sourceCount: number;
  created: number;
  updated: number;
  deactivated: number;
};

export default function CoaPage() {
  const { data: session } = useSession();
  const [coas, setCoas] = useState<Coa[]>([]);
  const [filteredCoas, setFilteredCoas] = useState<Coa[]>([]);
  const [latestSync, setLatestSync] = useState<{
    timestamp: string;
    details?: { status?: string; error?: string; summary?: SyncSummary };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;
  const canCreateCoa = canShowMasterCrud(
    'coa',
    Boolean(session?.user?.access?.activityAccess?.createCoa)
  );
  const canEditCoa = canShowMasterCrud(
    'coa',
    Boolean(session?.user?.access?.activityAccess?.editCoa)
  );
  const canDeleteCoa = canShowMasterCrud(
    'coa',
    Boolean(session?.user?.access?.activityAccess?.deleteCoa)
  );
  const canRunSync = Boolean(session?.user?.id);

  const loadData = async () => {
    const [coaResponse, syncResponse] = await Promise.all([
      fetch('/api/workspace-management/coa'),
      fetch('/api/workspace-management/sync/coa'),
    ]);
    const coaPayload = await coaResponse.json();
    const syncPayload = await syncResponse.json();
    if (!coaResponse.ok) throw new Error(coaPayload.error || 'Failed to load COA');
    if (!syncResponse.ok) throw new Error(syncPayload.error || 'Failed to load sync status');

    const list = coaPayload.coas || [];
    setCoas(list);
    setFilteredCoas(list);
    setLatestSync(syncPayload.latest || null);
  };

  useEffect(() => {
    loadData()
      .catch(() => {
        setError('Failed to load data');
        setCoas([]);
        setFilteredCoas([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredCoas(coas);
    } else {
      const keyword = searchKeyword.trim().toLowerCase();
      setFilteredCoas(
        coas.filter((coa) =>
          `${coa.accountCode} ${coa.accountName} ${coa.description ?? ''}`
            .toLowerCase()
            .includes(keyword)
        )
      );
    }
    setCurrentPage(1);
  }, [searchKeyword, coas]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = filteredCoas.slice(startIndex, startIndex + itemsPerPage);

  const runSync = async () => {
    setMessage(null);
    setIsSyncing(true);
    try {
      const response = await fetch('/api/workspace-management/sync/coa', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || 'Sync failed');
        return;
      }

      const summary = payload.summary as SyncSummary | undefined;
      setMessage(
        summary
          ? `Sync selesai: source ${summary.sourceCount}, created ${summary.created}, updated ${summary.updated}.`
          : 'Sync COA berhasil dijalankan.'
      );
      await loadData();
    } catch {
      setMessage('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">COA (Kode Akun)</h1>

      <MasterSyncBanner
        label="COA"
        canRunSync={canRunSync}
        isSyncing={isSyncing}
        onSync={runSync}
        latestSync={latestSync}
        message={message}
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} />
        {canCreateCoa && (
          <Link
            href="/workspace-management/coa/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add COA
          </Link>
        )}
      </div>

      {error && <div className="text-red-500 py-4">{error}</div>}

      <Card>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>#</TableHead>
              <TableHead>Account Code</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16" />
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <TableEmptyRow colSpan={6}>
                {searchKeyword.trim() ? 'No matches' : 'No COA'}
              </TableEmptyRow>
            ) : (
              currentRows.map((coa, index) => (
                <TableBodyRow key={coa.id}>
                  <TableCell>{startIndex + index + 1}</TableCell>
                  <TableCell>{coa.accountCode}</TableCell>
                  <TableCell>{coa.accountName}</TableCell>
                  <TableCell>{coa.description || '-'}</TableCell>
                  <TableCell>{coa.isActive ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell>
                    <CoaActions
                      coaId={coa.id}
                      onDelete={loadData}
                      canEdit={canEditCoa}
                      canDelete={canDeleteCoa}
                    />
                  </TableCell>
                </TableBodyRow>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredCoas.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
