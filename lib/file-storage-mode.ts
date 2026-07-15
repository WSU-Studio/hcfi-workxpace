export type FileStorageMode = 's3' | 'local';

/**
 * Mode penyimpanan file supporting documents:
 * - `s3` (default) — production / staging (bucket Hyundai via AWS_*)
 * - `local` — dev lokal: file di `.data/` (tanpa AWS)
 *
 * Set `FILE_STORAGE=local` di `.env` saat develop di localhost.
 */
export function getFileStorageMode(): FileStorageMode {
  const raw = process.env.FILE_STORAGE?.trim().toLowerCase();
  if (raw === 'local' || raw === 'filesystem') return 'local';
  return 's3';
}

export function isLocalFileStorageEnabled(): boolean {
  return getFileStorageMode() === 'local';
}
