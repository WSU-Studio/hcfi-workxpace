const BODY_PREVIEW_CHARS = 240;

export const CONFINS_DEFAULT_TIMEOUT_MS = 30_000;

export const resolveConfinsBaseUrl = (): string =>
  process.env.CONFINS_BASE_URL || process.env.CREDIT_SIMULATION_API_URL || '';

export function previewConfinsBody(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '(empty)';
  return compact.length > BODY_PREVIEW_CHARS
    ? `${compact.slice(0, BODY_PREVIEW_CHARS)}…`
    : compact;
}

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export type ConfinsFetchResult = {
  ok: boolean;
  status: number;
  contentType: string;
  text: string;
  json: unknown | null;
  parseError: boolean;
};

type ConfinsFetchOptions = {
  path: string;
  body: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

/**
 * Low-level Confins POST. Does not interpret ReturnObject / login envelopes.
 */
export async function fetchConfinsJson(options: ConfinsFetchOptions): Promise<ConfinsFetchResult> {
  const baseUrl = resolveConfinsBaseUrl();
  if (!baseUrl) {
    throw new Error('Missing required env: CONFINS_BASE_URL (or activate mock API in Application Settings)');
  }

  const timeoutMs = options.timeoutMs ?? CONFINS_DEFAULT_TIMEOUT_MS;
  const url = `${baseUrl}${options.path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(options.body),
      signal: controller.signal,
    });

    const rawText = await response.text();
    const text = stripBom(rawText).trim();
    const contentType = response.headers.get('content-type') ?? '';

    let json: unknown | null = null;
    let parseError = false;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        parseError = true;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      contentType,
      text,
      json,
      parseError,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Confins request timed out after ${timeoutMs}ms path=${options.path}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
