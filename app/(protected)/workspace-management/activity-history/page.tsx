'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
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

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function ActivityHistoryPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/workspace-management/activity-history')
      .then((r) => (r.ok ? r.json() : { activities: [] }))
      .then((data) => setActivities(data.activities || []))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Activity History</h1>
      <Card>
        <Table className="text-xs">
          <thead>
            <TableHeaderRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableHeaderRow>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <TableEmptyRow colSpan={5}>No activity recorded yet.</TableEmptyRow>
            ) : (
              activities.map((a) => (
                <TableBodyRow key={a.id}>
                  <TableCell>{formatDate(a.timestamp)}</TableCell>
                  <TableCell>{a.user?.name ?? '-'}</TableCell>
                  <TableCell>{a.entityType} {a.entityCode ? `(${a.entityCode})` : ''}</TableCell>
                  <TableCell>
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 capitalize">
                      {a.action}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="max-w-xl space-y-0.5 break-words">
                      {Object.entries(a.details || {}).length === 0 ? (
                        <span className="text-gray-500">-</span>
                      ) : (
                        Object.entries(a.details || {}).map(([key, value]) => (
                          <p key={key}>
                            <span className="font-medium text-gray-700">{key}:</span>{' '}
                            <span className="text-gray-600">{formatDetailValue(value)}</span>
                          </p>
                        ))
                      )}
                    </div>
                  </TableCell>
                </TableBodyRow>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
