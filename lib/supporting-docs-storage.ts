export type SupportingDocsScope =
  | 'budget-plans'
  | 'budget-requests'
  | 'payment-requests';

export const LOCAL_SUPPORTING_DOCS_API_PREFIX = '/api/dev/supporting-docs/';

/** Legacy prefix kept so existing local files remain readable. */
const LEGACY_SUPPORTING_DOCS_PREFIX = 'budget-plans/supporting-docs/';

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

const ALLOWED_SCOPES = new Set<SupportingDocsScope>([
  'budget-plans',
  'budget-requests',
  'payment-requests',
]);

export function parseSupportingDocsScope(raw: unknown): SupportingDocsScope {
  if (typeof raw === 'string' && ALLOWED_SCOPES.has(raw as SupportingDocsScope)) {
    return raw as SupportingDocsScope;
  }
  return 'budget-plans';
}

export function supportingDocsKeyPrefix(scope: SupportingDocsScope): string {
  return `${scope}/supporting-docs/`;
}

export function isSupportingDocsKey(key: string): boolean {
  if (key.includes('..') || key.includes('\\') || key.startsWith('/')) return false;

  const prefixes = [
    LEGACY_SUPPORTING_DOCS_PREFIX,
    ...Array.from(ALLOWED_SCOPES).map((scope) => supportingDocsKeyPrefix(scope)),
  ];

  return prefixes.some((prefix) => {
    if (!key.startsWith(prefix)) return false;
    const rest = key.slice(prefix.length);
    return Boolean(rest) && !rest.includes('//');
  });
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

/** @deprecated Use supportingDocsKeyPrefix('budget-plans') */
export const SUPPORTING_DOCS_PREFIX = supportingDocsKeyPrefix('budget-plans');
