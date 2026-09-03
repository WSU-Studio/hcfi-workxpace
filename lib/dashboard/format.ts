import { formatCurrency } from '@/lib/utils';

export function formatIdr(amount: number): string {
  return `IDR ${formatCurrency(amount)}`;
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPercent(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(digits)}%`;
}

/** Compact axis labels (15M, 2.5M, 800K). */
export function formatCompactIdr(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    const value = abs / 1_000_000_000;
    const digits = value >= 10 ? 0 : 1;
    return `${sign}${value.toFixed(digits).replace(/\.0$/, '')}B`;
  }
  if (abs >= 1_000_000) {
    const value = abs / 1_000_000;
    const digits = value >= 10 ? 0 : 1;
    return `${sign}${value.toFixed(digits).replace(/\.0$/, '')}M`;
  }
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}K`;
  return `${sign}${Math.round(abs)}`;
}
