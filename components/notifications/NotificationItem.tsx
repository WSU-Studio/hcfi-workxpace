'use client';

import { formatDate } from '@/lib/utils';

interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  };
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  return (
    <div
      className={`rounded-lg border p-3 ${notification.isRead ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
      onClick={() => !notification.isRead && onMarkAsRead(notification.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{notification.title}</p>
          <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
          <p className="text-xs text-gray-500 mt-1">{formatDate(notification.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="text-xs text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
