'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import LoadingSpin from '@/components/ui/LoadingSpin';
import BudgetRequestExpandedDetailView from '@/components/budget-requests/BudgetRequestExpandedDetailView';
import { isBudgetRequestCompactDetailView } from '@/lib/deployment-ui-policy';

type BudgetRequestDetailApi = {
  id: string;
  code: string;
  subject: string;
  description: string | null;
  notes: string | null;
  requestDate: string;
  requestorName?: string | null;
  fiscalYear: number;
  status: string;
  vatAmount?: number;
  whtAmount?: number;
  invoiceAmount?: number;
  grandTotal?: number;
  budgetPlan: {
    code: string;
    subject: string;
    coaId?: string | null;
    opexType?: string | null;
    originOffice?: string | null;
    project?: { name: string } | null;
    category?: { name: string } | null;
    costCenter?: { name: string } | null;
    categoryKeyIndex?: { name: string } | null;
    opexAllocation?: { name: string } | null;
  };
  department: { name: string };
  lineItems: {
    item: string;
    qty: number;
    unitPrice: number;
    subtotal?: number;
    deduction?: number;
    total: number;
  }[];
  accountOptions?: { id: string; accountCode: string; accountName: string }[];
  originOffices?: { code: string; name: string; isActive: boolean }[];
};

const compactDetailEnabled = isBudgetRequestCompactDetailView();

export default function BudgetRequestExpandedDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<BudgetRequestDetailApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!compactDetailEnabled) {
      router.replace(`/budget-requests/${id}`);
    }
  }, [id, router]);

  useEffect(() => {
    if (!compactDetailEnabled) return;
    fetch(`/api/budget-requests/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (!compactDetailEnabled) return <LoadingSpin />;
  if (isLoading) return <LoadingSpin />;
  if (!data) return <div className="text-gray-600">Not found</div>;

  const transactionAmount = data.lineItems?.reduce((s, l) => s + Number(l.total ?? 0), 0) ?? 0;
  const vatAmount = Number(data.vatAmount ?? 0);
  const whtAmount = Number(data.whtAmount ?? 0);
  const invoiceAmount = Number(data.invoiceAmount ?? transactionAmount + vatAmount);
  const grandTotal = Number(data.grandTotal ?? invoiceAmount - whtAmount);

  const accountLabel = (() => {
    const coaId = data.budgetPlan?.coaId;
    if (!coaId) return '-';
    const account = data.accountOptions?.find((item) => item.id === coaId);
    return account ? `${account.accountCode} - ${account.accountName}` : coaId;
  })();

  const opexType = data.budgetPlan?.opexType || '-';

  const originOfficeLabel = (() => {
    const officeCode = data.budgetPlan?.originOffice;
    if (!officeCode) return '-';
    const office = data.originOffices?.find((item) => item.code === officeCode);
    return office ? `${office.code} - ${office.name}` : officeCode;
  })();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link href={`/budget-requests/${id}`} className="text-blue-600 hover:underline">
        ← Back
      </Link>

      <BudgetRequestExpandedDetailView
        data={data}
        originOfficeLabel={originOfficeLabel}
        accountLabel={accountLabel}
        opexType={opexType}
        totals={{
          transactionAmount,
          vatAmount,
          whtAmount,
          invoiceAmount,
          grandTotal,
        }}
      />
    </div>
  );
}
