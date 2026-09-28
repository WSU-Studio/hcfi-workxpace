import { fetchConfinsJson, previewConfinsBody } from './http';

const DEFAULT_LOGIN_PATH = '/v4/Authenticate/Login';
const DEFAULT_EXPIRES_IN_SEC = 1_500;
const SESSION_EXPIRY_BUFFER_MS = 60_000;

type ConfinsLoginResponse = {
  AccessToken?: string;
  RefreshToken?: string;
  ExpiresIn?: number | string;
  SessionState?: string;
  Scope?: string;
  StatusCode?: string;
  Message?: string;
  HeaderObj?: {
    StatusCode?: string;
    Message?: string;
  };
};

type ConfinsSession = {
  accessToken: string;
  expiresAt: number;
};

export type ConfinsAdInsKey = {
  /** Static gateway key (`ADINSKEY`). Never the login JWT. */
  adInsKey?: string;
  /** Login `AccessToken`, sent as `Authorization: Bearer`. */
  accessToken?: string;
  /** True when `accessToken` came from login and can be refreshed after 401. */
  fromSession: boolean;
};

/**
 * Headers for Confins data calls, matching Postman collection WSU 1.04.
 * The gateway rejects a JWT placed in `AdInsKey` (HTTP 401). The session
 * token belongs in `Authorization`. `AdInsKey` stays the static gateway key.
 */
export function buildConfinsAuthHeaders(credential: ConfinsAdInsKey): Record<string, string> {
  const headers: Record<string, string> = {};
  if (credential.adInsKey) {
    headers.AdInsKey = credential.adInsKey;
  }
  if (credential.accessToken) {
    headers.Authorization = `Bearer ${credential.accessToken}`;
  }
  return headers;
}

let session: ConfinsSession | null = null;
let loginInFlight: Promise<string> | null = null;

function readEnv(name: string): string {
  return process.env[name]?.trim() || '';
}

function getConfinsLoginUsername(): string {
  return readEnv('CONFINS_USERNAME');
}

function getConfinsLoginPassword(): string {
  return readEnv('CONFINS_PASSWORD');
}

function getLegacyAdInsKey(): string {
  return readEnv('ADINSKEY');
}

function hasConfinsLoginCredentials(): boolean {
  return Boolean(getConfinsLoginUsername() && getConfinsLoginPassword());
}

function getLoginPath(): string {
  return readEnv('CONFINS_LOGIN_PATH') || DEFAULT_LOGIN_PATH;
}

function asRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return payload as Record<string, unknown>;
}

function pickStatusCode(payload: unknown): string {
  const data = asRecord(payload);
  if (!data) return '';
  const header = asRecord(data.HeaderObj);
  const raw = data.StatusCode ?? header?.StatusCode ?? '';
  return String(raw).trim();
}

function pickMessage(payload: unknown): string {
  const data = asRecord(payload);
  if (!data) return '';
  const header = asRecord(data.HeaderObj);
  const raw = data.Message ?? header?.Message ?? '';
  return String(raw).trim();
}

export function isConfinsAuthFailure(httpStatus: number, payload: unknown): boolean {
  if (httpStatus === 401 || httpStatus === 403) return true;
  const statusCode = pickStatusCode(payload);
  if (statusCode === '401' || statusCode === '403') return true;
  const message = pickMessage(payload).toLowerCase();
  return (
    message.includes('invalid user credentials') ||
    message.includes('unauthorized') ||
    message.includes('token expired') ||
    message.includes('session expired')
  );
}

function isSessionFresh(current: ConfinsSession | null): current is ConfinsSession {
  if (!current?.accessToken) return false;
  return Date.now() < current.expiresAt - SESSION_EXPIRY_BUFFER_MS;
}

function parseExpiresInMs(value: ConfinsLoginResponse['ExpiresIn']): number {
  const seconds = Number(value);
  const expiresInSec = Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_EXPIRES_IN_SEC;
  return expiresInSec * 1_000;
}

async function performLogin(): Promise<string> {
  const username = getConfinsLoginUsername();
  const password = getConfinsLoginPassword();
  if (!username || !password) {
    throw new Error('Missing required env: CONFINS_USERNAME and CONFINS_PASSWORD');
  }

  const loginPath = getLoginPath();
  const legacyKey = getLegacyAdInsKey();
  const fetched = await fetchConfinsJson({
    path: loginPath,
    body: {
      password,
      username,
      IsRememberMe: true,
    },
    headers: legacyKey ? { AdInsKey: legacyKey } : undefined,
  });

  if (fetched.parseError) {
    throw new Error(
      `Invalid JSON from Confins (${fetched.status} ${fetched.contentType || 'no-content-type'}) ` +
        `path=${loginPath} body=${previewConfinsBody(fetched.text)}`,
    );
  }

  const data = (fetched.json ?? {}) as ConfinsLoginResponse;
  if (!fetched.ok || isConfinsAuthFailure(fetched.status, data) || !data.AccessToken) {
    const message =
      pickMessage(data) ||
      `Confins login failed with status ${fetched.status} path=${loginPath}`;
    throw new Error(message);
  }

  const ttlMs = parseExpiresInMs(data.ExpiresIn);
  session = {
    accessToken: data.AccessToken,
    expiresAt: Date.now() + ttlMs,
  };
  console.info(`[Confins] session acquired, expires in ${Math.round(ttlMs / 1000)}s`);
  return data.AccessToken;
}

async function getAccessToken(): Promise<string> {
  if (isSessionFresh(session)) {
    return session.accessToken;
  }

  if (loginInFlight) {
    return loginInFlight;
  }

  loginInFlight = performLogin().finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

export function invalidateConfinsSession(): void {
  session = null;
}

/**
 * Auth material for Confins data APIs (Postman collection WSU 1.04).
 *
 * Login `AccessToken` is sent as `Authorization: Bearer`.
 * Static `ADINSKEY` is sent as `AdInsKey` when set.
 * With only `ADINSKEY`, data calls use that header and skip login.
 */
export async function getConfinsAdInsKey(): Promise<ConfinsAdInsKey> {
  const legacyKey = getLegacyAdInsKey() || undefined;

  if (hasConfinsLoginCredentials()) {
    const accessToken = await getAccessToken();
    return { accessToken, adInsKey: legacyKey, fromSession: true };
  }

  if (legacyKey) {
    return { adInsKey: legacyKey, fromSession: false };
  }

  throw new Error(
    'Missing Confins auth: set CONFINS_USERNAME and CONFINS_PASSWORD (API 1.04 login), or ADINSKEY (legacy static header)',
  );
}
