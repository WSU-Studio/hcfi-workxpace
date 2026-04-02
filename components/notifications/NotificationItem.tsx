'use client';

import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    targetUrl?: string | null;
  };
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function NotificationItem({ notification, onMarkAsRead, onDismiss }: NotificationItemProps) {
  const body = (
    <div>
      <p className="text-sm font-semibold">{notification.title}</p>
      <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
      <p className="text-xs text-gray-500 mt-1">{formatDate(notification.createdAt)}</p>
      {notification.targetUrl ? (
        <p className="mt-2 text-xs font-medium text-blue-600">View budget plan</p>
      ) : null}
    </div>
  );

  return (
    <div
      className={`rounded-lg border p-3 ${notification.isRead ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
      onClick={() => !notification.isRead && onMarkAsRead(notification.id)}
    >
      <div className="flex items-start justify-between gap-2">
        {notification.targetUrl ? (
          <Link
            href={notification.targetUrl}
            className="flex-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => !notification.isRead && onMarkAsRead(notification.id)}
          >
            {body}
          </Link>
        ) : (
          <div className="flex-1">{body}</div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(notification.id);
          }}
          className="text-xs text-gray-600 hover:underline cursor-pointer "
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
