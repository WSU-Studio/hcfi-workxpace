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
    linkLabel?: string | null;
  };
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

function linkLabelFor(notification: NotificationItemProps['notification']): string | null {
  if (notification.linkLabel) return notification.linkLabel;
  const url = notification.targetUrl;
  if (!url) return null;
  if (url.includes('/payment-requests/')) return 'View payment request';
  if (url.includes('/budget-requests/')) return 'View budget request';
  if (url.includes('/budget-plans/')) return 'View budget plan';
  return null;
}

export default function NotificationItem({ notification, onMarkAsRead, onDismiss }: NotificationItemProps) {
  const linkLabel = linkLabelFor(notification);
  const body = (
    <div>
      <p className="text-sm font-semibold">{notification.title}</p>
      <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
      <p className="text-xs text-gray-500 mt-1">{formatDate(notification.createdAt)}</p>
      {notification.targetUrl && linkLabel ? (
        <p className="mt-2 text-xs font-medium text-blue-600">{linkLabel}</p>
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
