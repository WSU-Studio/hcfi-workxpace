import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-gray-800">403</h1>
      <p className="text-gray-600">You do not have permission to access this page.</p>
      <Link href="/dashboard" className="text-blue-600 hover:underline">
        Return to Dashboard
      </Link>
    </div>
  );
}
