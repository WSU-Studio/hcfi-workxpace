import PageClient from './PageClient';
import { renderClientPage, type DynamicPageProps } from '@/lib/next/render-client-page';

export default async function Page(props: DynamicPageProps) {
  return renderClientPage(props, <PageClient />);
}
