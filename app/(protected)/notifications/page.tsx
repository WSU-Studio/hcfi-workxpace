'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { formatDate } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  targetUrl?: string | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) return;
      const data = await response.json();
      setNotifications(data.notifications || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
      </div>

      <Card className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">No notifications yet.</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border p-4 ${notification.isRead ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-gray-700">{notification.message}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatDate(notification.createdAt)}</p>
                  {notification.targetUrl ? (
                    <Link href={notification.targetUrl} className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
                      Open related budget plan
                    </Link>
                  ) : null}
                </div>
                {!notification.isRead ? (
                  <button
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    className="shrink-0 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Mark as read
                  </button>
                ) : (
                  <span className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">Read</span>
                )}
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
