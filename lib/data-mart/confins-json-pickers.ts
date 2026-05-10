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

/** Confins FMS Payment Request vs E-GL Manual Journal (FP&A guideline #1). */
export function deriveDataInterfaceSource(ebudgetSource?: string | null, snapshot?: Record<string, unknown>): string {
  const fromApi = snapshot
    ? pickFirstString(snapshot, ['DataInterfaceSource', 'dataInterfaceSource', 'SourceSystem'])
    : null;
  if (fromApi) {
    const u = fromApi.toUpperCase();
    if (u.includes('EGL') || u.includes('E-GL') || u.includes('JOURNAL')) return 'EGL';
    return fromApi.startsWith('Confins') ? fromApi : 'Confins';
  }
  if (ebudgetSource) {
    const u = ebudgetSource.toUpperCase();
    if (u.includes('E-GL') || u.includes('EGL')) return 'EGL (Manual Journal)';
    if (u.includes('CORE')) return 'Confins (FMS_Payment Request)';
  }
  return 'Confins';
}
