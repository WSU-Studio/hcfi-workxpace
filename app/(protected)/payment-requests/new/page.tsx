import NewPaymentRequestClient from './NewPaymentRequestClient';

type PageProps = {
  params: Promise<Record<string, never>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Server entry: unwrap async `params` / `searchParams` (Next.js 15) so the
 * client form never receives those Promise props (avoids Dev Overlay
 * Object.keys enumeration warnings).
 */
export default async function NewPaymentRequestPage({ params, searchParams }: PageProps) {
  await params;
  await searchParams;
  return <NewPaymentRequestClient />;
}
