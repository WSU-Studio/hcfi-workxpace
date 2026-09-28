import {
  buildConfinsAuthHeaders,
  getConfinsAdInsKey,
  invalidateConfinsSession,
  isConfinsAuthFailure,
} from './auth';
import {
  CONFINS_DEFAULT_TIMEOUT_MS,
  fetchConfinsJson,
  previewConfinsBody,
  resolveConfinsBaseUrl,
} from './http';

type ConfinsEnvelope<T> = {
  ReturnObject?: T;
  StatusCode?: string;
  Message?: string;
  ErrorMessages?: unknown;
  HeaderObj?: {
    StatusCode?: string;
    Message?: string;
  };
};

type ConfinsRequestOptions = {
  path: string;
  body: Record<string, unknown>;
  /**
   * Employee master sync / SSO lookup must always hit the live Confins API.
   * Ignores "Activate Mock API" and mock fallback — fails loudly if API is down.
   */
  liveOnly?: boolean;
  /** Override default request timeout (ms). Budget-real / EGL payloads can exceed 30s. */
  timeoutMs?: number;
  /**
   * When false, network/timeout errors are rethrown instead of returning mock fixture.
   * Use for multi-sourceType reconciliation so a failed EGL call is not replaced by
   * CONFINS mock rows.
   */
  allowMockFallback?: boolean;
};

const LOCAL_DEV = process.env.NODE_ENV !== 'production';

const isMockEnabledFromEnv = (): boolean =>
  process.env.CONFINS_USE_MOCK === 'true' || (LOCAL_DEV && process.env.CONFINS_USE_MOCK !== 'false');

const isMockFallbackEnabled = (): boolean =>
  process.env.CONFINS_MOCK_FALLBACK !== 'false';

export class ConfinsClient {
  async post<T>(options: ConfinsRequestOptions): Promise<T[]> {
    const { liveOnly = false, timeoutMs = CONFINS_DEFAULT_TIMEOUT_MS, allowMockFallback = true } = options;

    if (!liveOnly) {
      const mockEnabled = await this.isMockEnabled();
      if (mockEnabled) {
        const { getConfinsMockData } = await import('./mock-data');
        return (await getConfinsMockData(options.path)) as T[];
      }
    }

    if (!resolveConfinsBaseUrl()) {
      throw new Error('Missing required env: CONFINS_BASE_URL (or activate mock API in Application Settings)');
    }

    try {
      let credential = await getConfinsAdInsKey();
      let fetched = await fetchConfinsJson({
        path: options.path,
        body: options.body,
        headers: buildConfinsAuthHeaders(credential),
        timeoutMs,
      });

      if (isConfinsAuthFailure(fetched.status, fetched.json) && credential.fromSession) {
        console.warn('[Confins] session rejected, re-authenticating', { path: options.path });
        invalidateConfinsSession();
        credential = await getConfinsAdInsKey();
        fetched = await fetchConfinsJson({
          path: options.path,
          body: options.body,
          headers: buildConfinsAuthHeaders(credential),
          timeoutMs,
        });
      }

      const data = (fetched.json ?? {}) as ConfinsEnvelope<T[]>;

      if (isConfinsAuthFailure(fetched.status, fetched.json)) {
        throw new Error(
          data.Message ||
            data.HeaderObj?.Message ||
            `Confins request failed with status ${fetched.status} path=${options.path}`,
        );
      }

      if (fetched.parseError) {
        throw new Error(
          `Invalid JSON from Confins (${fetched.status} ${fetched.contentType || 'no-content-type'}) ` +
            `path=${options.path} body=${previewConfinsBody(fetched.text)}`,
        );
      }

      if (!fetched.ok) {
        const message =
          data?.Message ||
          `Confins request failed with status ${fetched.status} path=${options.path} body=${previewConfinsBody(fetched.text)}`;
        throw new Error(message);
      }

      if (!Array.isArray(data?.ReturnObject)) {
        const statusHint = data?.StatusCode ? ` StatusCode=${data.StatusCode}` : '';
        const messageHint = data?.Message ? ` Message=${data.Message}` : '';
        throw new Error(
          `Invalid Confins response: ReturnObject is not an array` +
            ` path=${options.path}${statusHint}${messageHint}` +
            (fetched.text ? ` body=${previewConfinsBody(fetched.text)}` : ''),
        );
      }

      return data.ReturnObject;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Invalid JSON from Confins')) {
        throw error;
      }
      if (
        error instanceof Error &&
        (error.message.startsWith('Missing required env') ||
          error.message.startsWith('Missing Confins auth') ||
          error.message.startsWith('Confins login failed') ||
          /invalid user credentials/i.test(error.message))
      ) {
        throw error;
      }
      if (!liveOnly && allowMockFallback && isMockFallbackEnabled()) {
        const { getConfinsMockData } = await import('./mock-data');
        return (await getConfinsMockData(options.path)) as T[];
      }
      throw error;
    }
  }

  private async isMockEnabled(): Promise<boolean> {
    return isConfinsMockEnabled();
  }
}

/**
 * Single source of truth: toggle "Activate Mock API" di Application Settings
 * (DB) menentukan perilaku — di environment manapun (dev / preview / prod).
 *
 * Env `CONFINS_USE_MOCK` tetap dipakai sebagai fallback **hanya** kalau DB
 * settings tidak bisa dibaca (mis. saat build static, atau Prisma belum siap).
 *
 * Catatan keamanan:
 *   Sebelumnya ada production gate yang memaksa mock = false di NODE_ENV
 *   production kecuali env explicit. Itu membuat toggle UI tidak fungsional di
 *   Vercel deployment. Karena akses Settings sudah dibatasi role admin dan
 *   toggle-nya visible, gate tersebut dihapus — admin yang sengaja toggle
 *   dianggap tahu konsekuensinya.
 */
export async function isConfinsMockEnabled(): Promise<boolean> {
  try {
    const { getApplicationSettings } = await import('@/lib/app-settings');
    const settings = await getApplicationSettings();
    return settings.confinsUseMock;
  } catch {
    return isMockEnabledFromEnv();
  }
}
