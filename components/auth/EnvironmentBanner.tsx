import { getAppEnvBanner } from '@/lib/deployment/app-env-banner';

const KIND_STYLES: Record<
  NonNullable<ReturnType<typeof getAppEnvBanner>>['kind'],
  string
> = {
  development: 'border-amber-300 bg-amber-50 text-amber-900',
  tqa: 'border-sky-300 bg-sky-50 text-sky-900',
  staging: 'border-violet-300 bg-violet-50 text-violet-900',
};

/**
 * Non-production environment notice for the login screen.
 * Renders nothing on production (or when NEXT_PUBLIC_APP_ENV is unset/prod
 * and NODE_ENV is not development).
 */
export default function EnvironmentBanner() {
  const banner = getAppEnvBanner();
  if (!banner) return null;

  return (
    <div
      role="status"
      aria-label={`${banner.badge}: ${banner.detail}`}
      className={`mb-6 rounded-lg border px-4 py-3 text-center ${KIND_STYLES[banner.kind]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider">
        {banner.badge}
      </p>
      <p className="mt-0.5 text-sm">{banner.detail}</p>
    </div>
  );
}
