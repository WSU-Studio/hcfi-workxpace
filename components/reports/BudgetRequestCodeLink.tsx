'use client';

import Link from 'next/link';

export type BudgetRequestCodeLinkProps = {
  code: string;
  budgetRequestId?: string | null;
};

/**
 * BR / GR document code as a text link to the request, or plain text when
 * there is no id. Shared by Budget Pivot (and any other report that surfaces
 * a BR number without owning navigation).
 */
export default function BudgetRequestCodeLink({
  code,
  budgetRequestId,
}: BudgetRequestCodeLinkProps) {
  const label = code.trim() || '—';
  const id = budgetRequestId?.trim() ?? '';

  if (!id || label === '—') {
    return <span className="font-mono text-slate-600">{label}</span>;
  }

  return (
    <Link
      href={`/budget-requests/${id}`}
      className="font-mono text-blue-600 hover:underline"
    >
      {label}
    </Link>
  );
}
