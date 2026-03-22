import Card from '@/components/ui/Card';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card className="p-6 space-y-4">
        <div><span className="text-gray-500">Name:</span> {session.user.name}</div>
        <div><span className="text-gray-500">Email:</span> {session.user.email}</div>
        <div><span className="text-gray-500">Role:</span> {session.user.role}</div>
      </Card>
    </div>
  );
}
