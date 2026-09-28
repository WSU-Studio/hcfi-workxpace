import { Prisma } from '@prisma/client';
import { readResponseJson } from '@/lib/fetch-json';
import { toSupportingDocsProxyUrl } from '@/lib/supporting-docs-storage';

export type SupportingDocsScope =
  | 'budget-plans'
  | 'budget-requests'
  | 'payment-requests'
  | 'branding';

/** Per-file cap for BP / BR / PR supporting documents. Branding logos stay smaller. */
export const SUPPORTING_DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;
export const SUPPORTING_DOCUMENT_MAX_LABEL = '50MB';

export function supportingDocumentTooLargeMessage(fileName: string): string {
  return `File is too large (max ${SUPPORTING_DOCUMENT_MAX_LABEL}): ${fileName}`;
}

export function normalizeSupportingDocs(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === 'string') return toSupportingDocsProxyUrl(item);
      if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string') {
        return toSupportingDocsProxyUrl(item.url);
      }
      return null;
    })
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
}

/** Prisma Json payload: string[] or DbNull when empty. */
export function supportingDocsForPersistence(
  input: unknown,
): string[] | typeof Prisma.DbNull {
  const docs = normalizeSupportingDocs(input);
  return docs.length > 0 ? docs : Prisma.DbNull;
}

/**
 * At least one supporting document: existing stored URLs plus files not yet uploaded.
 * Shared by Budget Request and Payment Request form validation and POST/PUT APIs.
 */
export function validateRequiredSupportingDocs(input: {
  existingUrls?: unknown;
  pendingFiles?: ArrayLike<unknown>;
}): string | null {
  const existingCount = normalizeSupportingDocs(input.existingUrls).length;
  const pendingCount = input.pendingFiles?.length ?? 0;
  if (existingCount + pendingCount < 1) {
    return 'At least one supporting document is required.';
  }
  return null;
}

/**
 * Human-readable file name from a stored supporting-doc URL.
 * Upload keys look like `<scope>/supporting-docs/<timestamp>-<uuid>-<fileName>`;
 * the timestamp/uuid prefix is stripped so users see the original name.
 */
export function supportingDocFileNameFromUrl(url: string): string {
  let fileName = url;
  try {
    const pathname = new URL(url, 'http://localhost').pathname;
    fileName = decodeURIComponent(pathname.split('/').pop() || url);
  } catch {
    fileName = url.split('/').pop() || url;
  }

  const match = fileName.match(
    /^\d{10,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i,
  );
  return match ? match[1] : fileName;
}

/**
 * Upload supporting documents via the shared API.
 * Storage is local (FILE_STORAGE=local) or S3 (production).
 */
export async function uploadSupportingDocs(
  files: File[],
  scope: SupportingDocsScope = 'budget-plans',
): Promise<string[]> {
  if (files.length === 0) return [];

  const uploadFormData = new FormData();
  uploadFormData.append('scope', scope);
  files.forEach((file) => uploadFormData.append('files', file));

  const uploadRes = await fetch('/api/supporting-documents/upload', {
    method: 'POST',
    body: uploadFormData,
  });

  const uploadBody = await readResponseJson<{
    error?: string;
    files?: Array<{ url: string }>;
  }>(uploadRes, 'Failed to upload supporting documents');

  if (!uploadRes.ok) {
    throw new Error(uploadBody.error ?? 'Failed to upload supporting documents');
  }

  return (uploadBody.files ?? []).map((item) => item.url);
}
