export const SUPPORTING_DOCS_PREFIX = 'budget-plans/supporting-docs/';
export const LOCAL_SUPPORTING_DOCS_API_PREFIX = '/api/dev/supporting-docs/';

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function isSupportingDocsKey(key: string): boolean {
  if (!key.startsWith(SUPPORTING_DOCS_PREFIX)) return false;
  if (key.includes('..') || key.includes('\\') || key.startsWith('/')) return false;
  // Reject empty segments / trailing slash tricks
  const rest = key.slice(SUPPORTING_DOCS_PREFIX.length);
  if (!rest || rest.includes('//')) return false;
  return true;
}

export function contentTypeFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : '';
  return CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream';
}

export function buildLocalSupportingDocsUrl(origin: string, key: string): string {
  if (!isSupportingDocsKey(key)) {
    throw new Error('Invalid supporting docs key');
  }
  const base = origin.replace(/\/$/, '');
  const safeKey = key
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${base}${LOCAL_SUPPORTING_DOCS_API_PREFIX}${safeKey}`;
}

export function resolveUploadOrigin(request: Request): string {
  const req = request as Request & { nextUrl?: URL };
  if (req.nextUrl?.origin) return req.nextUrl.origin;

  const headers = request.headers;
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (host) {
    const proto = headers.get('x-forwarded-proto') ?? 'http';
    return `${proto}://${host}`;
  }

  const fromEnv = process.env.NEXTAUTH_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  return 'http://localhost:3090';
}
