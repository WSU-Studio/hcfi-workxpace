'use client';

import ManualMatchModal from '@/components/reconciliation/ManualMatchModal';
import ReconciliationTable from '@/components/reconciliation/ReconciliationTable';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import type {
  ConfinsCashDisbursement,
  ConfinsMockListMeta,
} from '@/lib/integrations/confins-mock/types';
import { formatDate } from '@/lib/utils';
import type { ReconciliationRequestOption, ReconciliationRow } from '@/types/reconciliation';
import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';

type BudgetRequestApiItem = {
  id: string;
  code: string;
  subject: string;
  fiscalYear: number;
  departmentId: string;
  status: string;
  coa?: string | null;
  grandTotal?: string | number;
  budgetPlan?: { code: string; subject: string };
  department?: { name: string };
};

type DepartmentApiItem = {
  id: string;
  code: string;
  name: string;
};

function toNumber(val: string | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRefCode(v: string): string {
  return v.trim().toUpperCase().replace(/[^A-Z0-9/]/g, '');
}

function isAutoMatchedByIncomingRef(requestCode: string, incomingRef: string): boolean {
  return normalizeRefCode(requestCode) === normalizeRefCode(incomingRef);
}

export default function ReconciliationPage() {
  const { data: session, status } = useSession();
  const now = new Date();

  const [fiscalYear, setFiscalYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [departmentId, setDepartmentId] = useState('');

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [payments, setPayments] = useState<ConfinsCashDisbursement[]>([]);
  const [requests, setRequests] = useState<ReconciliationRequestOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentApiItem[]>([]);

  const [manualMap, setManualMap] = useState<Record<string, string>>({});
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [selectedManualRequestId, setSelectedManualRequestId] = useState('');

  const canManualMatch = Boolean(session?.user?.access?.activityAccess?.editReconciliationMapping);
  const canSync = Boolean(session?.user?.access?.activityAccess?.runReconciliationSync);

  const runSync = async () => {
    if (!canSync) return;
    setSyncing(true);
    setSyncMessage(null);

    try {
      const requestsUrl = new URL('/api/budget-requests', window.location.origin);
      const paymentsUrl = new URL('/api/integrations/mock/confins/payments', window.location.origin);
      const planUrl = new URL('/api/budget-plans', window.location.origin);

      paymentsUrl.searchParams.set('fiscalYear', fiscalYear);
      paymentsUrl.searchParams.set('month', month);
      if (departmentId) paymentsUrl.searchParams.set('departmentId', departmentId);
      if (departmentId) planUrl.searchParams.set('departmentId', departmentId);

      const [reqRes, payRes, planRes] = await Promise.all([
        fetch(requestsUrl.toString()),
        fetch(paymentsUrl.toString()),
        fetch(planUrl.toString()),
      ]);

      if (!reqRes.ok || !payRes.ok || !planRes.ok) {
        throw new Error('Failed to sync reconciliation data');
      }

      const reqData = (await reqRes.json()) as { requests: BudgetRequestApiItem[] };
      const payData = (await payRes.json()) as {
        payments: ConfinsCashDisbursement[];
        meta: ConfinsMockListMeta;
      };
      const planData = (await planRes.json()) as { departments: DepartmentApiItem[] };

      const yearInt = Number(fiscalYear);
      const normalizedRequests = (reqData.requests ?? [])
        .filter((r) => r.status === 'Approved')
        .filter((r) => r.fiscalYear === yearInt)
        .filter((r) => !departmentId || r.departmentId === departmentId)
        .map((r) => ({
          id: r.id,
          code: r.code,
          subject: r.subject,
          fiscalYear: r.fiscalYear,
          departmentId: r.departmentId,
          departmentCode: null,
          departmentName: r.department?.name ?? null,
          budgetPlanCode: r.budgetPlan?.code ?? null,
          coa: r.coa ?? null,
          expectedAmount: toNumber(r.grandTotal),
        }));

      setRequests(normalizedRequests);
      setPayments(payData.payments ?? []);
      setDepartments(planData.departments ?? []);
      setLastSyncedAt(payData.meta?.lastSyncedAt ?? new Date().toISOString());
      setSyncMessage(
        `Sync berhasil: ${payData.meta?.recordCount ?? 0} payment ditarik, ${normalizedRequests.length} budget request tersedia.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setSyncMessage(message);
    } finally {
      setSyncing(false);
    }
  };

  const rows = useMemo<ReconciliationRow[]>(() => {
    const byId = new Map(requests.map((req) => [req.id, req]));
    return payments.map((payment) => {
      const manualRequestId = manualMap[payment.id];
      const manualRequest = manualRequestId ? byId.get(manualRequestId) ?? null : null;
      const autoRequest =
        requests.find((req) => isAutoMatchedByIncomingRef(req.code, payment.incomingReferenceId)) ?? null;
      const selectedRequest = manualRequest ?? autoRequest;
      const paidAmount = toNumber(payment.amount);
      const expectedAmount = selectedRequest?.expectedAmount ?? 0;

      return {
        payment,
        matchedRequest: selectedRequest,
        expectedAmount,
        paidAmount,
        variance: paidAmount - expectedAmount,
        matchType: manualRequest ? 'manual' : autoRequest ? 'auto' : 'unmatched',
      };
    });
  }, [manualMap, payments, requests]);

  const activeRow = useMemo(
    () => rows.find((row) => row.payment.id === activePaymentId) ?? null,
    [activePaymentId, rows]
  );

  const availableRequestOptions = useMemo(() => {
    if (!activeRow) return requests;
    const candidates = requests.filter((request) => {
      if (departmentId && request.departmentId !== departmentId) return false;
      if (activeRow.payment.departmentId && request.departmentId !== activeRow.payment.departmentId) return false;
      return true;
    });
    return candidates.length > 0 ? candidates : requests;
  }, [activeRow, departmentId, requests]);

  const openManualMatch = (paymentId: string) => {
    if (!canManualMatch) return;
    setSelectedManualRequestId(manualMap[paymentId] ?? '');
    setActivePaymentId(paymentId);
  };

  const saveManualMatch = () => {
    if (!activePaymentId || !selectedManualRequestId) return;
    setManualMap((prev) => ({
      ...prev,
      [activePaymentId]: selectedManualRequestId,
    }));
    setActivePaymentId(null);
    setSelectedManualRequestId('');
  };

  if (status === 'loading') {
    return <p className="text-gray-600">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reconciliation</h2>
        <p className="mt-1 text-sm text-gray-600">
          Rekonsiliasi dilakukan berbasis Budget Request. Auto-match hanya terjadi jika Incoming ID dari Confins
          sama persis dengan Form ID budget request.
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Department</span>
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">All</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.code} - {dept.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Fiscal Year</span>
            <Select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Month</span>
            <Select value={month} onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                <option key={m} value={String(m)}>
                  {new Date(2026, m - 1, 1).toLocaleString('en-US', { month: 'long' })}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-end">
            <Button type="button" onClick={runSync} disabled={!canSync || syncing}>
              {syncing ? 'Running sync...' : 'Run Integration Process'}
            </Button>
          </div>
          <div className="flex items-end text-sm text-gray-500">
            {lastSyncedAt ? `Last synced ${formatDate(lastSyncedAt)}` : 'Belum pernah sync'}
          </div>
        </div>
        {!canSync && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Anda tidak memiliki izin menjalankan sinkronisasi.
          </p>
        )}
        {syncMessage && <p className="text-sm text-gray-700">{syncMessage}</p>}
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">Reconciliation Result</h3>
          <div className="text-sm text-gray-600">
            Matched:{' '}
            <span className="font-semibold text-emerald-700">
              {rows.filter((row) => row.matchType !== 'unmatched').length}
            </span>{' '}
            | Unmatched:{' '}
            <span className="font-semibold text-rose-700">
              {rows.filter((row) => row.matchType === 'unmatched').length}
            </span>
          </div>
        </div>
        <ReconciliationTable rows={rows} canEditManual={canManualMatch} onManualMatch={openManualMatch} />
      </Card>

      <ManualMatchModal
        open={Boolean(activePaymentId)}
        row={activeRow}
        requestOptions={availableRequestOptions}
        selectedRequestId={selectedManualRequestId}
        onChangeRequest={setSelectedManualRequestId}
        onClose={() => {
          setActivePaymentId(null);
          setSelectedManualRequestId('');
        }}
        onSave={saveManualMatch}
      />
    </div>
  );
}
