import UserForm from '../../components/UserForm';

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserForm userId={id} />;
}
