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
        <Table>
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
                    <span className="px-2 py-0.5 rounded text-sm bg-blue-100 text-blue-800 capitalize">
                      {a.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    {JSON.stringify(a.details)}
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
