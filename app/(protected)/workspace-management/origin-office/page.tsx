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
import OriginOfficeActions from './components/OriginOfficeActions';
import type { OriginOffice } from '@/types/origin-office';
import { canShowMasterCrud, isSyncManagedMaster } from '@/lib/workspace-master-ui-policy';
import MasterSyncBanner from '@/components/workspace-management/MasterSyncBanner';

type SyncSummary = {
  sourceCount: number;
  created: number;
  updated: number;
  deactivated: number;
};

export default function OriginOfficePage() {
  const { data: session } = useSession();
  const [offices, setOffices] = useState<OriginOffice[]>([]);
  const [filteredOffices, setFilteredOffices] = useState<OriginOffice[]>([]);
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
  const isSyncManaged = isSyncManagedMaster('origin-office');
  const canCreateOriginOffice = canShowMasterCrud(
    'origin-office',
    Boolean(session?.user?.access?.activityAccess?.createOriginOffice)
  );
  const canEditOriginOffice = canShowMasterCrud(
    'origin-office',
    Boolean(session?.user?.access?.activityAccess?.editOriginOffice)
  );
  const canDeleteOriginOffice = canShowMasterCrud(
    'origin-office',
    Boolean(session?.user?.access?.activityAccess?.deleteOriginOffice)
  );
  const canRunSync = Boolean(session?.user?.id);

  const loadData = async () => {
    const [officesResponse, syncResponse] = await Promise.all([
      fetch('/api/workspace-management/origin-office'),
      fetch('/api/workspace-management/sync/origin-office'),
    ]);
    const officesPayload = await officesResponse.json();
    const syncPayload = await syncResponse.json();
    if (!officesResponse.ok) throw new Error(officesPayload.error || 'Failed to load origin office');
    if (!syncResponse.ok) throw new Error(syncPayload.error || 'Failed to load sync status');

    const list = officesPayload.originOffices || [];
    setOffices(list);
    setFilteredOffices(list);
    setLatestSync(syncPayload.latest || null);
  };

  useEffect(() => {
    loadData()
      .catch(() => {
        setError('Failed to load data');
        setOffices([]);
        setFilteredOffices([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredOffices(offices);
    } else {
      const keyword = searchKeyword.trim().toLowerCase();
      setFilteredOffices(
        offices.filter((office) =>
          `${office.code} ${office.name} ${office.address ?? ''} ${office.officeType ?? ''}`
            .toLowerCase()
            .includes(keyword)
        )
      );
    }
    setCurrentPage(1);
  }, [searchKeyword, offices]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = filteredOffices.slice(startIndex, startIndex + itemsPerPage);

  const runSync = async () => {
    setMessage(null);
    setIsSyncing(true);
    try {
      const response = await fetch('/api/workspace-management/sync/origin-office', {
        method: 'POST',
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || 'Sync failed');
        return;
      }

      const summary = payload.summary as SyncSummary | undefined;
      setMessage(
        summary
          ? `Sync selesai: source ${summary.sourceCount}, created ${summary.created}, updated ${summary.updated}.`
          : 'Sync origin office berhasil dijalankan.'
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
      <h1 className="text-2xl font-semibold">Origin Office</h1>

      {isSyncManaged && (
        <MasterSyncBanner
          label="Origin Office"
          canRunSync={canRunSync}
          isSyncing={isSyncing}
          onSync={runSync}
          latestSync={latestSync}
          message={message}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <SearchInput value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} />
        {canCreateOriginOffice && (
          <Link
            href="/workspace-management/origin-office/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Origin Office
          </Link>
        )}
      </div>

      {error && <div className="text-red-500 py-4">{error}</div>}

      <Card>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>#</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16" />
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <TableEmptyRow colSpan={7}>
                {searchKeyword.trim() ? 'No matches' : 'No origin offices'}
              </TableEmptyRow>
            ) : (
              currentRows.map((office, index) => (
                <TableBodyRow key={office.id}>
                  <TableCell>{startIndex + index + 1}</TableCell>
                  <TableCell>{office.code}</TableCell>
                  <TableCell>{office.name}</TableCell>
                  <TableCell>{office.officeType || '-'}</TableCell>
                  <TableCell>{office.address || '-'}</TableCell>
                  <TableCell>{office.isActive ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell>
                    <OriginOfficeActions
                      originOfficeId={office.id}
                      onDelete={loadData}
                      canEdit={canEditOriginOffice}
                      canDelete={canDeleteOriginOffice}
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
        totalItems={filteredOffices.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
