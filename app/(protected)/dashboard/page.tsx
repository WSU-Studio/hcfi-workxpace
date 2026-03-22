import Card from '@/components/ui/Card';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      <Card>
        <p className="text-gray-600">Welcome to Workxpace eBudgeting. Use the sidebar to navigate.</p>
      </Card>
    </div>
  );
}
