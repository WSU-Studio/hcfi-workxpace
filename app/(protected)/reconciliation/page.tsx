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
import toast from 'react-hot-toast';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const [saving, setSaving] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageType, setSaveMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [payments, setPayments] = useState<ConfinsCashDisbursement[]>([]);
  const [requests, setRequests] = useState<ReconciliationRequestOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentApiItem[]>([]);

  const [savedPaymentIds, setSavedPaymentIds] = useState<Set<string>>(new Set());

  const [manualMap, setManualMap] = useState<Record<string, string>>({});
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [selectedManualRequestId, setSelectedManualRequestId] = useState('');

  const [resetEligible, setResetEligible] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const canManualMatch = Boolean(session?.user?.access?.activityAccess?.editReconciliationMapping);
  const canSync = Boolean(session?.user?.access?.activityAccess?.runReconciliationSync);
  const canSave = Boolean(session?.user?.access?.activityAccess?.saveReconciliationResult);

  const loadSavedPaymentIds = useCallback(async () => {
    try {
      const res = await fetch('/api/reconciliation/saved-ids');
      if (!res.ok) return;
      const data = (await res.json()) as { ids?: string[] };
      setSavedPaymentIds(new Set(data.ids ?? []));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') loadSavedPaymentIds();
  }, [status, loadSavedPaymentIds]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    (async () => {
      try {
        const res = await fetch('/api/reconciliation/reset-eligibility');
        if (!res.ok) return;
        const data = (await res.json()) as { enabled?: boolean };
        setResetEligible(Boolean(data.enabled));
      } catch {
        setResetEligible(false);
      }
    })();
  }, [status]);

  const paymentsVisible = useMemo(
    () => payments.filter((p) => !savedPaymentIds.has(p.id)),
    [payments, savedPaymentIds]
  );

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
      paymentsUrl.searchParams.set('apiModel', 'v103');
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
    return paymentsVisible.map((payment) => {
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
  }, [manualMap, paymentsVisible, requests]);

  const matchedRowsToSave = useMemo(
    () => rows.filter((r) => r.matchType !== 'unmatched' && r.matchedRequest),
    [rows]
  );

  const saveMatched = async () => {
    if (!canSave || matchedRowsToSave.length === 0) return;
    setSaving(true);
    setSaveMessageType('info');
    setSaveMessage('Menyimpan hasil rekonsiliasi...');
    try {
      const fy = Number(fiscalYear);
      const mo = Number(month);
      const payload = {
        rows: matchedRowsToSave.map((r) => ({
          confinsPaymentDocId: r.payment.id,
          budgetRequestId: r.matchedRequest!.id,
          matchType: r.matchType,
          incomingReferenceId: r.payment.incomingReferenceId,
          paidAmount: r.paidAmount,
          expectedAmount: r.expectedAmount,
          fiscalYear: fy,
          month: mo,
          departmentId: r.payment.departmentId,
          voucherNumber: r.payment.voucherNumber,
          paymentDescription: r.payment.description,
          paymentSource: r.payment.source,
          glAccountCode: r.payment.glAccountCode,
          glAccountName: r.payment.glAccountName,
          confinsSnapshot:
            (r.payment.rawPayload as Record<string, unknown> | undefined) ??
            (r.payment as unknown as Record<string, unknown>),
          currencyCode: r.payment.currency,
        })),
      };

      const res = await fetch('/api/reconciliation/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan');

      const newIds = matchedRowsToSave.map((r) => r.payment.id);
      setSavedPaymentIds((prev) => new Set([...prev, ...newIds]));
      const savedCount = data.savedCount ?? newIds.length;
      setSaveMessageType('success');
      setSaveMessage(`${savedCount} baris berhasil disimpan.`);
      toast.success(`${savedCount} baris disimpan.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan';
      setSaveMessageType('error');
      setSaveMessage(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const resetSavedForTesting = async () => {
    if (!canSave || !resetEligible || resetLoading) return;
    const ok = window.confirm(
      'Hapus semua simpanan rekonsiliasi yang sudah disimpan? Baris akan muncul lagi di daftar kerja; staging Data Mart untuk simpanan tersebut ikut terhapus.'
    );
    if (!ok) return;
    setResetLoading(true);
    try {
      const res = await fetch('/api/reconciliation/reset-saved', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.hint ?? 'Reset gagal');
      const n = data.deletedCount ?? 0;
      toast.success(`Reset ok: ${n} simpanan dihapus.`);
      await loadSavedPaymentIds();
      if (canSync) await runSync();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Reset gagal';
      toast.error(msg);
    } finally {
      setResetLoading(false);
    }
  };

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
          Reconciliation based on Budget Request. Auto-match if Incoming ID is the same as Form ID request. Save the matched results to complete the rows; saved rows will no longer appear in the work list and can be viewed in the Reports menu.
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Department</span>
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">All Departments</option>
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
          <div className="flex flex-wrap items-end gap-2">
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
          <div className="flex flex-wrap items-center gap-3">
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
            <Button
              type="button"
              onClick={saveMatched}
              disabled={!canSave || saving || matchedRowsToSave.length === 0}
              className="disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save reconciliation results'}
            </Button>
          </div>
        </div>
        {saving && (
          <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Saving... please wait...
          </p>
        )}
        {!saving && saveMessage && (
          <p
            className={`rounded-md border px-3 py-2 text-xs ${
              saveMessageType === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : saveMessageType === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-gray-200 bg-gray-50 text-gray-700'
            }`}
          >
            {saveMessage}
          </p>
        )}
        {!canSave && (
          <p className="text-xs text-gray-500">Allow &quot;Save Reconciliation Results&quot; in Access Control to save the results.</p>
        )}
        <ReconciliationTable rows={rows} canEditManual={canManualMatch} onManualMatch={openManualMatch} />
      </Card>

      {canSave && (
        <Card className="space-y-3 border-dashed border-amber-200 bg-amber-50/40 p-4">
          <h3 className="text-sm font-semibold text-amber-950">Pengujian ulang (development / QA)</h3>
          <p className="text-xs leading-relaxed text-amber-950/90">
            Transaksi yang sudah disimpan disembunyikan dari daftar ini. Untuk menguji lagi dari awal, kosongkan simpanan
            DB: tombol di bawah (aktif di <code className="rounded bg-white/80 px-1">NODE_ENV=development</code> atau jika{' '}
            <code className="rounded bg-white/80 px-1">RECONCILIATION_ALLOW_RESET=true</code>
            ). Setelah reset, klik <strong>Run Integration Process</strong> untuk memuat ulang mock payment.
          </p>
          <p className="text-xs text-amber-950/85">
            Contoh mock bawaan: pembayaran dari <strong>Budget Request Approved</strong> (ID{' '}
            <code className="rounded bg-white/80 px-1">CFN-REQ-…</code>), plus edge case{' '}
            <code className="rounded bg-white/80 px-1">BR/IT/00X</code> (typo → manual match) dan{' '}
            <code className="rounded bg-white/80 px-1">CFN-EDGE-VARIANCE</code> (nominal beda).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="danger"
              disabled={!resetEligible || resetLoading}
              onClick={resetSavedForTesting}
            >
              {resetLoading ? 'Memproses…' : 'Reset simpanan rekonsiliasi (testing)'}
            </Button>
            {!resetEligible && (
              <span className="text-xs text-amber-900/80">
                Tombol nonaktif di build ini — gunakan development atau set env di atas.
              </span>
            )}
          </div>
        </Card>
      )}

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
