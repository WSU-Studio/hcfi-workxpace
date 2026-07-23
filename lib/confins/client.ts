type ConfinsEnvelope<T> = {
  ReturnObject?: T;
  StatusCode?: string;
  Message?: string;
  ErrorMessages?: unknown;
};

type ConfinsRequestOptions = {
  path: string;
  body: Record<string, unknown>;
  /**
   * Employee master sync / SSO lookup must always hit the live Confins API.
   * Ignores "Activate Mock API" and mock fallback — fails loudly if API is down.
   */
  liveOnly?: boolean;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const LOCAL_DEV = process.env.NODE_ENV !== 'production';
const BODY_PREVIEW_CHARS = 240;

const resolveConfinsBaseUrl = (): string =>
  process.env.CONFINS_BASE_URL || process.env.CREDIT_SIMULATION_API_URL || '';

const isMockEnabledFromEnv = (): boolean =>
  process.env.CONFINS_USE_MOCK === 'true' || (LOCAL_DEV && process.env.CONFINS_USE_MOCK !== 'false');

const isMockFallbackEnabled = (): boolean =>
  process.env.CONFINS_MOCK_FALLBACK !== 'false';

function previewBody(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '(empty)';
  return compact.length > BODY_PREVIEW_CHARS
    ? `${compact.slice(0, BODY_PREVIEW_CHARS)}…`
    : compact;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export class ConfinsClient {
  private readonly baseUrl: string;
  private readonly adInsKey: string | null;

  constructor() {
    this.baseUrl = resolveConfinsBaseUrl();
    this.adInsKey = process.env.ADINSKEY || null;
  }

  async post<T>(options: ConfinsRequestOptions): Promise<T[]> {
    const { liveOnly = false } = options;

    if (!liveOnly) {
      const mockEnabled = await this.isMockEnabled();
      if (mockEnabled) {
        const { getConfinsMockData } = await import('./mock-data');
        return (await getConfinsMockData(options.path)) as T[];
      }
    }

    if (!this.baseUrl) {
      throw new Error('Missing required env: CONFINS_BASE_URL (or activate mock API in Application Settings)');
    }

    if (!this.adInsKey) {
      throw new Error('Missing required env: ADINSKEY');
    }

    const url = `${this.baseUrl}${options.path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          AdInsKey: this.adInsKey,
        },
        body: JSON.stringify(options.body),
        signal: controller.signal,
      });

      const rawText = await response.text();
      const text = stripBom(rawText).trim();
      const contentType = response.headers.get('content-type') ?? '';

      let data: ConfinsEnvelope<T[]> = {};
      if (text) {
        try {
          data = JSON.parse(text) as ConfinsEnvelope<T[]>;
        } catch {
          throw new Error(
            `Invalid JSON from Confins (${response.status} ${contentType || 'no-content-type'}) ` +
              `path=${options.path} body=${previewBody(text)}`,
          );
        }
      }

      if (!response.ok) {
        const message =
          data?.Message ||
          `Confins request failed with status ${response.status} path=${options.path} body=${previewBody(text)}`;
        throw new Error(message);
      }

      if (!Array.isArray(data?.ReturnObject)) {
        const statusHint = data?.StatusCode ? ` StatusCode=${data.StatusCode}` : '';
        const messageHint = data?.Message ? ` Message=${data.Message}` : '';
        throw new Error(
          `Invalid Confins response: ReturnObject is not an array` +
            ` path=${options.path}${statusHint}${messageHint}` +
            (text ? ` body=${previewBody(text)}` : ''),
        );
      }

      return data.ReturnObject;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Confins request timed out after ${DEFAULT_TIMEOUT_MS}ms path=${options.path}`);
      }
      // Keep payload/parse failures visible — do not hide them behind mock data.
      if (error instanceof Error && error.message.startsWith('Invalid JSON from Confins')) {
        throw error;
      }
      if (!liveOnly && isMockFallbackEnabled()) {
        const { getConfinsMockData } = await import('./mock-data');
        return (await getConfinsMockData(options.path)) as T[];
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
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
