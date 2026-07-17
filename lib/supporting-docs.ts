import { Prisma } from '@prisma/client';

export type SupportingDocsScope =
  | 'budget-plans'
  | 'budget-requests'
  | 'payment-requests';

export function normalizeSupportingDocs(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string') {
        return item.url;
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

  const uploadBody = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(uploadBody.error ?? 'Failed to upload supporting documents');
  }

  return (uploadBody.files ?? []).map((item: { url: string }) => item.url);
}
