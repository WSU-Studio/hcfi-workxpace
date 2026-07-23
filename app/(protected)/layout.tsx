import ProtectedShell from './ProtectedShell';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Server layout: unwrap Next.js 15 async `params` before rendering the client shell.
 * A client layout that ignored `params` still received the Promise prop and triggered
 * Dev Overlay "params are being enumerated" warnings.
 */
export default async function ProtectedLayout({ children, params }: LayoutProps) {
  await params;
  return <ProtectedShell>{children}</ProtectedShell>;
}
