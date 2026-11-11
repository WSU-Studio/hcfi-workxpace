/**
 * Login-page environment marker so non-prod builds are not mistaken for production.
 *
 * Banner shows **only** when `NEXT_PUBLIC_APP_ENV` is set explicitly to a
 * non-production value. Empty / unset / production → no banner.
 * No `NODE_ENV` fallback (so `next dev` alone does not show a banner).
 *
 * Values:
 *   development | local | tqa | staging | production | (empty)
 */

export type AppEnvKind = 'development' | 'tqa' | 'staging';

export type AppEnvBanner = {
  kind: AppEnvKind;
  /** Short badge, e.g. DEVELOPMENT / TQA */
  badge: string;
  /** One-line clarification under the badge */
  detail: string;
};

function normalizeAppEnv(raw: string | undefined): string {
  return (raw ?? '').trim().toLowerCase();
}

/**
 * Resolve which non-production banner to show, or null when unset / production.
 * Safe to call from client components (`NEXT_PUBLIC_*` is inlined at build time).
 */
export function getAppEnvBanner(): AppEnvBanner | null {
  const explicit = normalizeAppEnv(process.env.NEXT_PUBLIC_APP_ENV);

  // Unset / empty / production → no banner
  if (!explicit || explicit === 'production' || explicit === 'prod') {
    return null;
  }

  if (explicit === 'tqa' || explicit === 'qa' || explicit === 'test') {
    return {
      kind: 'tqa',
      badge: 'TQA',
      detail: 'Testing environment — not production',
    };
  }

  if (explicit === 'staging' || explicit === 'stage') {
    return {
      kind: 'staging',
      badge: 'STAGING',
      detail: 'Staging environment — not production',
    };
  }

  if (
    explicit === 'development' ||
    explicit === 'dev' ||
    explicit === 'local'
  ) {
    return {
      kind: 'development',
      badge: 'DEVELOPMENT',
      detail: 'Local development — not production',
    };
  }

  // Unknown value → treat as no banner (safe default)
  return null;
}
