type ConfinsEnvelope<T> = {
  ReturnObject?: T;
  StatusCode?: string;
  Message?: string;
  ErrorMessages?: unknown;
};

type ConfinsRequestOptions = {
  path: string;
  body: Record<string, unknown>;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const LOCAL_DEV = process.env.NODE_ENV !== 'production';

const resolveConfinsBaseUrl = (): string =>
  process.env.CONFINS_BASE_URL || process.env.CREDIT_SIMULATION_API_URL || '';

const isMockEnabledFromEnv = (): boolean =>
  process.env.CONFINS_USE_MOCK === 'true' || (LOCAL_DEV && process.env.CONFINS_USE_MOCK !== 'false');

const isMockFallbackEnabled = (): boolean =>
  process.env.CONFINS_MOCK_FALLBACK !== 'false';

export class ConfinsClient {
  private readonly baseUrl: string;
  private readonly adInsKey: string | null;

  constructor() {
    this.baseUrl = resolveConfinsBaseUrl();
    this.adInsKey = process.env.ADINSKEY || null;
  }

  async post<T>(options: ConfinsRequestOptions): Promise<T[]> {
    const mockEnabled = await this.isMockEnabled();
    if (mockEnabled) {
      const { getConfinsMockData } = await import('./mock-data');
      return getConfinsMockData(options.path) as T[];
    }

    if (!this.baseUrl) {
      throw new Error('Missing required env: CONFINS_BASE_URL (or activate mock API in Application Settings)');
    }

    if (!this.adInsKey) {
      throw new Error('Missing required env: ADINSKEY');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}${options.path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          AdInsKey: this.adInsKey,
        },
        body: JSON.stringify(options.body),
        signal: controller.signal,
      });

      const text = await response.text();
      const data = (text ? JSON.parse(text) : {}) as ConfinsEnvelope<T[]>;

      if (!response.ok) {
        const message = data?.Message || `Confins request failed with status ${response.status}`;
        throw new Error(message);
      }

      if (!Array.isArray(data?.ReturnObject)) {
        throw new Error('Invalid Confins response: ReturnObject is not an array');
      }

      return data.ReturnObject;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON from Confins');
      }
      if (isMockFallbackEnabled()) {
        const { getConfinsMockData } = await import('./mock-data');
        return getConfinsMockData(options.path) as T[];
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async isMockEnabled(): Promise<boolean> {
    if (process.env.NODE_ENV === 'production' && process.env.CONFINS_USE_MOCK !== 'true') {
      return false;
    }

    try {
      const { getApplicationSettings } = await import('@/lib/app-settings');
      const settings = await getApplicationSettings();
      return settings.confinsUseMock;
    } catch {
      return isMockEnabledFromEnv();
    }
  }
}
