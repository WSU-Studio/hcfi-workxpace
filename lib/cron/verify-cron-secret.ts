/**
 * Shared bearer-token gate for scheduled jobs (GitHub Actions, server crontab).
 *
 * Scheduler-agnostic: both Option A and Option B call the same API route with
 * the same `CRON_SECRET` — only the external trigger differs.
 */
export function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;

  const authHeader = request.headers.get('authorization') ?? '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return false;

  return token === expected;
}
