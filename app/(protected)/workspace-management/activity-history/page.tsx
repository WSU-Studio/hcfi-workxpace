'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Entity</th>
                <th className="text-left py-3 px-4">Action</th>
                <th className="text-left py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No activity recorded yet.
                  </td>
                </tr>
              ) : (
                activities.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 whitespace-nowrap">{formatDate(a.timestamp)}</td>
                    <td className="py-3 px-4">{a.user?.name ?? '-'}</td>
                    <td className="py-3 px-4">{a.entityType} {a.entityCode ? `(${a.entityCode})` : ''}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-sm bg-blue-100 text-blue-800 capitalize">
                        {a.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {JSON.stringify(a.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
