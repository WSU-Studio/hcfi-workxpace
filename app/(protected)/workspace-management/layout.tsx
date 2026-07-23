import WorkspaceManagementShell from './WorkspaceManagementShell';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspaceManagementLayout({ children, params }: LayoutProps) {
  await params;
  return <WorkspaceManagementShell>{children}</WorkspaceManagementShell>;
}
