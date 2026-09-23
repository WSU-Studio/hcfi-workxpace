/**
 * One-off data fix: canonicalize Budget Request money fields.
 *
 * Canonical rules (same as `normalizeBudgetRequestBody` + form tax summary):
 *   transactionNet = invoiceAmount - whtAmount
 *                  (= totalAmount + vatAmount - whtAmount)
 *   monthly allocation = transactionNet  (full amount on each selected month)
 *   grandTotal         = transactionNet × monthCount
 *
 * Legacy rows often mixed pre-tax totals, even-split allocations, or
 * transaction-only grandTotal. This script rewrites `grandTotal` and each
 * allocation row from the stored tax fields so list, pivot, outstanding,
 * and reconciliation all share one number.
 *
 * Usage:
 *   npx tsx scripts/migrate-br-period-grand-total.ts           # dry-run
 *   npx tsx scripts/migrate-br-period-grand-total.ts --apply   # write DB
 *
 * Safe to re-run: rows already matching are skipped.
 */

import { config as loadEnv } from 'dotenv';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

loadEnv({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const CENTS_EPS = 0.005;

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Same formula as form `computeTaxSummary` / normalize transaction net. */
function transactionNetFromTaxFields(row: {
  totalAmount: Prisma.Decimal | null;
  vatAmount: Prisma.Decimal | null;
  whtAmount: Prisma.Decimal | null;
  invoiceAmount: Prisma.Decimal | null;
}): number {
  const total = toNumber(row.totalAmount);
  const vat = toNumber(row.vatAmount);
  const wht = toNumber(row.whtAmount);
  const invoice = toNumber(row.invoiceAmount) || total + vat;
  return Math.round((invoice - wht) * 100) / 100;
}

async function main() {
  const rows = await prisma.budgetRequest.findMany({
    select: {
      id: true,
      code: true,
      totalAmount: true,
      vatAmount: true,
      whtAmount: true,
      invoiceAmount: true,
      grandTotal: true,
      allocations: {
        select: { id: true, year: true, month: true, allocation: true },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const planned: Array<{
    id: string;
    code: string;
    monthCount: number;
    transactionNet: number;
    fromGrandTotal: number;
    toGrandTotal: number;
    fromAllocSample: number;
    toAlloc: number;
    allocationIds: string[];
  }> = [];

  for (const row of rows) {
    const positiveAllocations = row.allocations.filter((a) => toNumber(a.allocation) > 0);
    if (positiveAllocations.length === 0) continue;

    const transactionNet = transactionNetFromTaxFields(row);
    if (transactionNet <= 0) continue;

    const monthCount = positiveAllocations.length;
    const periodTotal = Math.round(transactionNet * monthCount * 100) / 100;
    const currentGrand = toNumber(row.grandTotal);
    const allocNeedsRewrite = positiveAllocations.some(
      (a) => Math.abs(toNumber(a.allocation) - transactionNet) > CENTS_EPS,
    );
    const grandNeedsRewrite = Math.abs(currentGrand - periodTotal) > CENTS_EPS;

    if (!allocNeedsRewrite && !grandNeedsRewrite) continue;

    planned.push({
      id: row.id,
      code: row.code,
      monthCount,
      transactionNet,
      fromGrandTotal: currentGrand,
      toGrandTotal: periodTotal,
      fromAllocSample: toNumber(positiveAllocations[0]?.allocation),
      toAlloc: transactionNet,
      allocationIds: positiveAllocations.map((a) => a.id),
    });
  }

  console.log(
    APPLY
      ? `Applying tax-aware period backfill (${planned.length} row(s))…`
      : `Dry-run: ${planned.length} Budget Request(s) would be updated (pass --apply to write).`,
  );
  console.log(
    'Rule: transactionNet = invoice − WHT; each month = transactionNet; grandTotal = transactionNet × months.',
  );

  for (const item of planned) {
    console.log(
      `  ${item.code}: grandTotal ${item.fromGrandTotal} → ${item.toGrandTotal}; ` +
        `alloc/mo ${item.fromAllocSample} → ${item.toAlloc} × ${item.monthCount}`,
    );
    if (!APPLY) continue;

    await prisma.$transaction(async (tx) => {
      await tx.budgetRequest.update({
        where: { id: item.id },
        data: { grandTotal: new Prisma.Decimal(item.toGrandTotal) },
      });
      for (const allocationId of item.allocationIds) {
        await tx.budgetRequestAllocation.update({
          where: { id: allocationId },
          data: { allocation: new Prisma.Decimal(item.toAlloc) },
        });
      }
    });
  }

  if (APPLY) {
    console.log(`Done. Updated ${planned.length} row(s).`);
  } else if (planned.length > 0) {
    console.log('Re-run with --apply to persist these changes.');
  } else {
    console.log('Nothing to update — all BRs with allocations already match the tax-aware period rule.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
