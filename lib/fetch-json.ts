/**
 * Parse a fetch Response as JSON, with a clear error when the body is HTML
 * (nginx/proxy/Next error page) instead of the expected API JSON.
 */
export async function readResponseJson<T = unknown>(
  response: Response,
  fallbackError = 'Request failed',
): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) {
    if (!response.ok) {
      throw new Error(`${fallbackError} (HTTP ${response.status})`);
    }
    return {} as T;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const contentType = response.headers.get('content-type') ?? 'unknown';
    const preview = trimmed.slice(0, 80).replace(/\s+/g, ' ');
    throw new Error(
      `${fallbackError} (HTTP ${response.status}, ${contentType}): server returned non-JSON (${preview})`,
    );
  }
}
