import { redirect } from 'next/navigation';
import type { DynamicPageProps } from '@/lib/next/render-client-page';

export default async function WorkspaceManagementPage(props: DynamicPageProps) {
  await props.params;
  await props.searchParams;
  redirect('/workspace-management/division');
}
