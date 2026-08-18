'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { ALL_DEPARTMENTS_LABEL, schemaLevelPicDisplayName } from '@/lib/approval-schema';

interface ApprovalLevel {
  id: string;
  stepOrder: number;
  levelType: string;
  role: {
    roleCode: string;
    roleName: string;
  } | null;
  pics?: Array<{ user?: { id: string; name: string } | null }>;
}

interface ApprovalSchemaDetail {
  id: string;
  code: string;
  name: string;
  type: string;
  period: string;
  department: {
    code: string;
    name: string;
  } | null;
  approvalLevels: ApprovalLevel[];
}

export default function ApprovalSchemaDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const id = params.id as string;
  const [schema, setSchema] = useState<ApprovalSchemaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canEditApprovalSchema = Boolean(session?.user?.access?.activityAccess?.editApprovalSchema);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/approval-schema/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setSchema(data.schema))
      .catch(() => setSchema(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!schema) return <div className="text-red-500">Approval schema not found</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/workspace-management/approval-schema" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h1 className="text-2xl font-semibold">Approval Schema Detail</h1>

      <Card className="space-y-4 p-6">
        <div>
          <label className="text-sm text-gray-500">Code</label>
          <p className="font-mono font-medium">{schema.code}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <p className="font-medium">{schema.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Department</label>
          <p className="font-medium">
            {schema.department
              ? `${schema.department.code} - ${schema.department.name}`
              : ALL_DEPARTMENTS_LABEL}
          </p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Type</label>
          <p className="font-medium">{schema.type}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Period</label>
          <p className="font-medium">{schema.period || 'Unlimited'}</p>
        </div>

        <div className="space-y-2 pt-2">
          <label className="text-sm text-gray-500">Approval Flow</label>
          {schema.approvalLevels.length === 0 ? (
            <p className="text-sm text-gray-500">No levels defined</p>
          ) : (
            <div className="space-y-2">
              {schema.approvalLevels.map((level) => (
                <div key={level.id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <span className="font-medium">Level {level.stepOrder}</span> - {level.levelType} ({level.role?.roleCode} - {level.role?.roleName})
                  <p className="mt-1 text-gray-600">
                    Specific PIC: {schemaLevelPicDisplayName(level.pics)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {canEditApprovalSchema && (
          <div className="pt-4">
            <Link href={`/workspace-management/approval-schema/${id}/edit`} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Edit
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
