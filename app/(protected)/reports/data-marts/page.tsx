'use client';

import Card from '@/components/ui/Card';
import { IconDatabase } from '@tabler/icons-react';
import { useSession } from 'next-auth/react';

export default function DataMartsReportPage() {
  const { data: session, status } = useSession();
  const canView = Boolean(session?.user?.access?.menuAccess?.reports);

  if (status === 'loading') {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-10 text-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!canView) {
    return (
      <Card className="p-8">
        <p className="text-center text-gray-600">You do not have access to this section.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Data Marts</h1>
        <p className="mt-1 text-sm text-gray-600">Browse and export curated analytical datasets.</p>
      </div>

      <Card className="p-10 border-dashed border-gray-300 bg-gray-50/50">
        <div className="flex flex-col items-center justify-center gap-4 text-center max-w-md mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
            <IconDatabase className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="font-medium text-gray-900">Data marts coming soon</p>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              This area will host linked data marts and self-service reporting. Add routes and content here as your
              models are ready.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
