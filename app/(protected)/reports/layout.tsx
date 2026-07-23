import ReportsShell from './ReportsShell';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsLayout({ children, params }: LayoutProps) {
  await params;
  return <ReportsShell>{children}</ReportsShell>;
}
