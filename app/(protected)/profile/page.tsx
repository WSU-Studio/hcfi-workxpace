import Card from '@/components/ui/Card';
import ChangePasswordForm from '@/components/profile/ChangePasswordForm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card className="flex flex-col gap-1 p-6">
        <div>
          <span className="text-gray-500">Name:</span> {session.user.name}
        </div>
        <div>
          <span className="text-gray-500 text-sm">Email:</span> {session.user.email}
        </div>
        <div>
          <span className="text-gray-500 text-sm">Role:</span> {session.user.role}
        </div>
      </Card>
      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Change password</h2>
          <p className="mt-1 text-sm text-gray-600">
            Enter your current password, then choose a new one. You will use the new password the
            next time you sign in with email.
          </p>
        </div>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
