import type { ReactNode } from 'react';

type DynamicPageProps = {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Server-side entry for App Router pages that render a client UI.
 * Awaits Next.js 15 async `params` / `searchParams` so those Promise props
 * are never passed to the client tree (avoids Dev Overlay Object.keys warnings).
 */
export async function renderClientPage(
  props: DynamicPageProps,
  client: ReactNode,
) {
  await props.params;
  await props.searchParams;
  return client;
}

export type { DynamicPageProps };
