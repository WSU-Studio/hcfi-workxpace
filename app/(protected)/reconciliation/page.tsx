'use client';

import ManualMatchModal from '@/components/reconciliation/ManualMatchModal';
import ReconciliationTable from '@/components/reconciliation/ReconciliationTable';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { formatDate } from '@/lib/utils';
import type { ConfinsCashDisbursement, ConfinsMockListMeta } from '@/lib/integrations/confins-mock/types';
import type { ReconciliationPlanOption, ReconciliationRow } from '@/types/reconciliation';
import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';

type BudgetPlanApiItem = {
  id: string;
  code: string;
  subject: string;
  fiscalYear: number;
  departmentId: string;
  coaId: string | null;
  department?: { id: string; code: string; name: string };
  allocations?: Array<{ month: number; allocation: string | number }>;
};

type DepartmentApiItem = {
  id: string;
  code: string;
  name: string;
};

function toNumber(val: string | number | null | undefined) {
  if (val == null) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function buildExpectedAmountByMonth(plan: BudgetPlanApiItem, month: number) {
  const currentMonth = plan.allocations?.find((a) => a.month === month);
  if (currentMonth) return toNumber(currentMonth.allocation);
  return plan.allocations?.reduce((sum, row) => sum + toNumber(row.allocation), 0) ?? 0;
}

function normalizeRefCode(v: string): string {
  return v.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isAutoMatchedByIncomingRef(formId: string, incomingRef: string): boolean {
  const normalizedForm = normalizeRefCode(formId);
  const normalizedIncoming = normalizeRefCode(incomingRef);
  if (!normalizedForm || !normalizedIncoming) return false;
  /** Hanya exact match (setelah trim + uppercase + strip separator). Contoh: IT2026003 vs 2026003 = tidak match. */
  return normalizedIncoming === normalizedForm;
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
  const [plans, setPlans] = useState<ReconciliationPlanOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentApiItem[]>([]);
  const [manualMap, setManualMap] = useState<Record<string, string>>({});
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [selectedManualPlanId, setSelectedManualPlanId] = useState('');

  const canManualMatch = Boolean(session?.user?.access?.activityAccess?.editReconciliationMapping);
  const canSync = Boolean(session?.user?.access?.activityAccess?.runReconciliationSync);

  const runSync = async () => {
    if (!canSync) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const planUrl = new URL('/api/budget-plans', window.location.origin);
      planUrl.searchParams.set('status', 'Approved');
      if (departmentId) planUrl.searchParams.set('departmentId', departmentId);

      const paymentUrl = new URL('/api/integrations/mock/confins/payments', window.location.origin);
      paymentUrl.searchParams.set('fiscalYear', fiscalYear);
      paymentUrl.searchParams.set('month', month);
      if (departmentId) paymentUrl.searchParams.set('departmentId', departmentId);

      const [planRes, paymentRes] = await Promise.all([
        fetch(planUrl.toString()),
        fetch(paymentUrl.toString()),
      ]);
      if (!planRes.ok || !paymentRes.ok) {
        throw new Error('Failed to sync reconciliation data');
      }

      const planData = (await planRes.json()) as {
        plans: BudgetPlanApiItem[];
        departments: DepartmentApiItem[];
      };
      const paymentData = (await paymentRes.json()) as {
        payments: ConfinsCashDisbursement[];
        meta: ConfinsMockListMeta;
      };

      const monthInt = Number(month);
      const normalizedPlans = planData.plans.map((plan) => ({
        id: plan.id,
        code: plan.code,
        subject: plan.subject,
        fiscalYear: plan.fiscalYear,
        departmentId: plan.departmentId,
        departmentCode: plan.department?.code ?? null,
        departmentName: plan.department?.name ?? null,
        coaId: plan.coaId ?? null,
        expectedAmount: buildExpectedAmountByMonth(plan, monthInt),
      }));

      setPlans(normalizedPlans);
      setDepartments(planData.departments ?? []);
      setPayments(paymentData.payments ?? []);
      setLastSyncedAt(paymentData.meta?.lastSyncedAt ?? new Date().toISOString());
      setSyncMessage(
        `Sync berhasil: ${paymentData.meta?.recordCount ?? 0} payment ditarik, ${normalizedPlans.length} budget plan tersedia.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setSyncMessage(message);
    } finally {
      setSyncing(false);
    }
  };

  const rows = useMemo<ReconciliationRow[]>(() => {
    const byId = new Map(plans.map((plan) => [plan.id, plan]));
    return payments.map((payment) => {
      const manualPlanId = manualMap[payment.id];
      const manualPlan = manualPlanId ? byId.get(manualPlanId) ?? null : null;
      const autoPlan =
        plans.find((plan) => isAutoMatchedByIncomingRef(plan.code, payment.incomingReferenceId)) ?? null;
      const selectedPlan = manualPlan ?? autoPlan;
      const paidAmount = toNumber(payment.amount);
      const expectedAmount = selectedPlan?.expectedAmount ?? 0;
      return {
        payment,
        matchedPlan: selectedPlan,
        expectedAmount,
        paidAmount,
        variance: paidAmount - expectedAmount,
        matchType: manualPlan ? 'manual' : autoPlan ? 'auto' : 'unmatched',
      };
    });
  }, [manualMap, payments, plans]);

  const activeRow = useMemo(
    () => rows.find((row) => row.payment.id === activePaymentId) ?? null,
    [activePaymentId, rows]
  );

  const availablePlanOptions = useMemo(() => {
    if (!activeRow) return plans;
    const payment = activeRow.payment;
    const candidates = plans.filter((plan) => {
      if (departmentId && plan.departmentId !== departmentId) return false;
      if (payment.departmentId && plan.departmentId !== payment.departmentId) return false;
      return true;
    });
    return candidates.length > 0 ? candidates : plans;
  }, [activeRow, departmentId, plans]);

  const openManualMatch = (paymentId: string) => {
    if (!canManualMatch) return;
    const existing = manualMap[paymentId] ?? '';
    setSelectedManualPlanId(existing);
    setActivePaymentId(paymentId);
  };

  const saveManualMatch = () => {
    if (!activePaymentId || !selectedManualPlanId) return;
    setManualMap((prev) => ({
      ...prev,
      [activePaymentId]: selectedManualPlanId,
    }));
    setActivePaymentId(null);
    setSelectedManualPlanId('');
  };

  if (status === 'loading') {
    return <p className="text-gray-600">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reconciliation</h2>
        <p className="mt-1 text-sm text-gray-600">
          Bandingkan budget plan, budget request yang disetujui, dan pembayaran dari Confins. Sync akan mencoba
          auto-match hanya jika Incoming ID dari Confins sama persis dengan Form ID budget plan; salah ketik atau
          format parsial harus dicocokkan manual lewat popup.
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
        planOptions={availablePlanOptions}
        selectedPlanId={selectedManualPlanId}
        onChangePlan={setSelectedManualPlanId}
        onClose={() => {
          setActivePaymentId(null);
          setSelectedManualPlanId('');
        }}
        onSave={saveManualMatch}
      />
    </div>
  );
}
