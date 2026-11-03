/**
 * Login-page environment marker so local / TQA are not mistaken for production.
 *
 * Prefer `NEXT_PUBLIC_APP_ENV` (build-time, works on TQA after `next build`).
 * Fallback: `NODE_ENV=development` (local `next dev` only — TQA runs as production).
 *
 * Values:
 *   development | local | tqa | staging | production | (empty)
 *
 * Production / empty → no banner.
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
 * Resolve which non-production banner to show, or null for production.
 * Safe to call from client components (`NEXT_PUBLIC_*` + inlined `NODE_ENV`).
 */
export function getAppEnvBanner(): AppEnvBanner | null {
  const explicit = normalizeAppEnv(process.env.NEXT_PUBLIC_APP_ENV);

  if (explicit === 'production' || explicit === 'prod') {
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

  // No explicit APP_ENV: show only during next dev / NODE_ENV=development
  if (!explicit && process.env.NODE_ENV === 'development') {
    return {
      kind: 'development',
      badge: 'DEVELOPMENT',
      detail: 'Local development — not production',
    };
  }

  return null;
}
