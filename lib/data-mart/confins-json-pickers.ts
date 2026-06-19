/** Normalisasi key JSON dari snapshot Confins/E-GL (campuran PascalCase vs camelCase). */

export function pickFirstString(snapshot: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = snapshot[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return null;
}

export function pickFirstDate(snapshot: Record<string, unknown>, keys: string[]): Date | null {
  for (const k of keys) {
    const v = snapshot[k];
    if (v == null) continue;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    if (typeof v === 'string') {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

/** Simpan nilai `DataInterfaceSource` dari Confins apa adanya (EGL, CONFINS, Other Receive, dll.). */
export function deriveDataInterfaceSource(ebudgetSource?: string | null, snapshot?: Record<string, unknown>): string {
  const fromApi = snapshot
    ? pickFirstString(snapshot, ['DataInterfaceSource', 'dataInterfaceSource', 'SourceSystem'])
    : null;
  if (fromApi) return fromApi;
  if (ebudgetSource?.trim()) return ebudgetSource.trim();
  return 'Confins';
}
