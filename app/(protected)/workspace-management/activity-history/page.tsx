'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import SearchInput from '@/components/ui/SearchInput';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';

interface Activity {
  id: string;
  entityType: string;
  entityCode: string | null;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
  user: { name: string; email: string };
}

const ACTION_FILTERS = ['All', 'create', 'update', 'delete', 'approve', 'review', 'decline'] as const;
const NON_STATE_KEYS = new Set(['note']);

interface ActivityStateChange {
  key: string;
  previous: unknown;
  current: unknown;
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return value.map((v) => String(v)).join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function formatDetailKey(key: string): string {
  const labels: Record<string, string> = {
    fromStatus: 'From Status',
    status: 'To Status',
    declineReason: 'Reason',
    previousStatus: 'Previous Status',
    monthCount: 'Month Count',
    selectedMonths: 'Selected Months',
    totalAllocation: 'Total Allocation',
    departmentCode: 'Department Code',
    departmentId: 'Department',
    projectId: 'Project',
    approvalSchemaId: 'Approval Schema',
    originOffice: 'Origin Office',
    fiscalYear: 'Fiscal Year',
    categoryId: 'Category',
    categoryKeyIndexId: 'Category Key Index',
    costCenterId: 'Cost Center',
    opexType: 'Type',
    opexAllocationId: 'Opex Allocation',
  };
  if (labels[key]) return labels[key];
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (s) => s.toUpperCase());
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stateBaseKey(rawKey: string): string {
  if (rawKey.startsWith('previous')) {
    const base = rawKey.slice('previous'.length);
    return base ? base.charAt(0).toLowerCase() + base.slice(1) : rawKey;
  }
  if (rawKey.startsWith('from')) {
    const base = rawKey.slice('from'.length);
    return base ? base.charAt(0).toLowerCase() + base.slice(1) : rawKey;
  }
  if (rawKey.startsWith('old')) {
    const base = rawKey.slice('old'.length);
    return base ? base.charAt(0).toLowerCase() + base.slice(1) : rawKey;
  }
  if (rawKey.startsWith('new')) {
    const base = rawKey.slice('new'.length);
    return base ? base.charAt(0).toLowerCase() + base.slice(1) : rawKey;
  }
  if (rawKey.startsWith('to')) {
    const base = rawKey.slice('to'.length);
    return base ? base.charAt(0).toLowerCase() + base.slice(1) : rawKey;
  }
  return rawKey;
}

function extractStateChanges(details: Record<string, unknown>): ActivityStateChange[] {
  const previousState =
    details.previousState && typeof details.previousState === 'object' && !Array.isArray(details.previousState)
      ? (details.previousState as Record<string, unknown>)
      : null;
  const currentState =
    details.currentState && typeof details.currentState === 'object' && !Array.isArray(details.currentState)
      ? (details.currentState as Record<string, unknown>)
      : null;

  if (previousState || currentState) {
    const keys = Array.from(new Set([...(previousState ? Object.keys(previousState) : []), ...(currentState ? Object.keys(currentState) : [])]));
    return keys.map((key) => ({
      key,
      previous: previousState?.[key],
      current: currentState?.[key],
    }));
  }

  const map = new Map<string, ActivityStateChange>();

  Object.entries(details).forEach(([rawKey, value]) => {
    if (NON_STATE_KEYS.has(rawKey) || rawKey === 'previousState' || rawKey === 'currentState') return;
    const key = stateBaseKey(rawKey);
    if (!map.has(key)) map.set(key, { key, previous: null, current: null });

    const item = map.get(key);
    if (!item) return;

    if (rawKey.startsWith('previous') || rawKey.startsWith('from') || rawKey.startsWith('old')) {
      item.previous = value;
    } else if (rawKey.startsWith('new') || rawKey.startsWith('to')) {
      item.current = value;
    } else {
      item.current = value;
    }
  });

  return Array.from(map.values());
}

export default function ActivityHistoryPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [actionFilter, setActionFilter] = useState<(typeof ACTION_FILTERS)[number]>('All');

  useEffect(() => {
    fetch('/api/workspace-management/activity-history')
      .then((r) => (r.ok ? r.json() : { activities: [] }))
      .then((data) => {
        const list = data.activities || [];
        setActivities(list);
        setFilteredActivities(list);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const kw = searchKeyword.trim().toLowerCase();

    const list = activities.filter((a) => {
      const detailsText = Object.entries(a.details || {})
        .map(([key, value]) => `${formatDetailKey(key)} ${formatDetailValue(value)}`)
        .join(' ')
        .toLowerCase();
      const entityText = `${a.entityType} ${a.entityCode ?? ''}`.toLowerCase();
      const userText = `${a.user?.name ?? ''} ${a.user?.email ?? ''}`.toLowerCase();
      const actionText = (a.action ?? '').toLowerCase();

      const matchesKeyword =
        !kw ||
        entityText.includes(kw) ||
        userText.includes(kw) ||
        actionText.includes(kw) ||
        detailsText.includes(kw);
      const matchesAction = actionFilter === 'All' || actionText === actionFilter;

      return matchesKeyword && matchesAction;
    });

    setFilteredActivities(list);
  }, [activities, searchKeyword, actionFilter]);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Activity History</h1>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search activity..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as (typeof ACTION_FILTERS)[number])}
          className="h-10 rounded-lg border border-slate-400 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer hover:border-blue-500"
        >
          {ACTION_FILTERS.map((action) => (
            <option key={action} value={action}>
              {action === 'All' ? 'All actions' : action.charAt(0).toUpperCase() + action.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <Card>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Previous State</TableHead>
              <TableHead>Current State</TableHead>
            </TableHeaderRow>
          </thead>
          <tbody>
            {filteredActivities.length === 0 ? (
              <TableEmptyRow colSpan={6}>No activity recorded yet.</TableEmptyRow>
            ) : (
              filteredActivities.map((a) => {
                const stateChanges = extractStateChanges(a.details || {});
                const hasPreviousState = stateChanges.some(
                  (change) => change.previous !== null && change.previous !== undefined && change.previous !== ''
                );

                return (
                <TableBodyRow className="text-sm" key={a.id}>
                  <TableCell>{formatDateTime(a.timestamp)}</TableCell>
                  <TableCell>{a.user?.name ?? '-'}</TableCell>
                  <TableCell>{a.entityType} {a.entityCode ? `(${a.entityCode})` : ''}</TableCell>
                  <TableCell>
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 capitalize">
                      {a.action}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="max-w-xl space-y-0.5 break-words">
                      {!hasPreviousState ? (
                        <span className="text-gray-500">-</span>
                      ) : (
                        stateChanges
                          .filter((change) => change.previous !== null && change.previous !== undefined && change.previous !== '')
                          .map((change) => (
                          <p className="text-xs" key={`prev-${change.key}`}>
                            <span className="font-medium text-gray-700">{formatDetailKey(change.key)}:</span>{' '}
                            <span className="text-gray-600 whitespace-pre-wrap">{formatDetailValue(change.previous)}</span>
                          </p>
                          ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="max-w-xl space-y-0.5 break-words">
                      {stateChanges.length === 0 ? (
                        <span className="text-gray-500">-</span>
                      ) : (
                        stateChanges.map((change) => (
                          <p className="text-xs" key={`curr-${change.key}`}>
                            <span className="font-medium text-gray-700">{formatDetailKey(change.key)}:</span>{' '}
                            <span className="text-gray-600 whitespace-pre-wrap">{formatDetailValue(change.current)}</span>
                          </p>
                        ))
                      )}
                    </div>
                  </TableCell>
                </TableBodyRow>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
