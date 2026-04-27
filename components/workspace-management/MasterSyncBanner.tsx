'use client';

type SyncSummary = {
  sourceCount: number;
  created: number;
  updated: number;
  deactivated: number;
};

type LatestSync = {
  timestamp: string;
  details?: {
    status?: string;
    error?: string;
    summary?: SyncSummary;
  };
} | null;

interface MasterSyncBannerProps {
  label: string;
  canRunSync: boolean;
  isSyncing: boolean;
  onSync: () => void;
  latestSync: LatestSync;
  message: string | null;
}

export default function MasterSyncBanner({
  label,
  canRunSync,
  isSyncing,
  onSync,
  latestSync,
  message,
}: MasterSyncBannerProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-2">
      <p>{label} dikelola melalui sinkronisasi.</p>
      <div className="flex flex-wrap items-center gap-3">
        {canRunSync && (
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
        {latestSync?.timestamp && (
          <span className="text-xs text-blue-900">
            Last sync: {new Date(latestSync.timestamp).toLocaleString('id-ID')}
          </span>
        )}
        {latestSync?.details?.summary && (
          <span className="text-xs text-blue-900">
            source {latestSync.details.summary.sourceCount}, created {latestSync.details.summary.created}, updated {latestSync.details.summary.updated}
          </span>
        )}
        {latestSync?.details?.status === 'failed' && latestSync.details.error && (
          <span className="text-xs text-red-700">Last error: {latestSync.details.error}</span>
        )}
        {message && <span className="text-xs text-blue-900">{message}</span>}
      </div>
    </div>
  );
}
