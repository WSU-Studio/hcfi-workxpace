# Migrate BR amounts to tax-aware period totals

One-off data fix so every Budget Request uses the **same money rule** as create/edit and reconciliation.

## Canonical formula

```
transactionNet = invoiceAmount − whtAmount
               (= totalAmount + vatAmount − whtAmount)

per-month allocation = transactionNet
grandTotal           = transactionNet × selected month count
```

Example (matches the BR detail breakdown):

| Field | Value |
|---|---|
| Transaction Amount | 10.000.000 |
| VAT / PPN | 1.100.000 |
| Invoice Amount | 11.100.000 |
| WHT / PPh | 200.000 |
| **transactionNet** | **10.900.000** |
| Selected months | 4 |
| **grandTotal (list / recon / outstanding)** | **43.600.000** |
| Pivot each month | 10.900.000 |

## What the script updates

For each BR with positive monthly allocations:

1. Recompute `transactionNet` from stored tax fields
2. Set **every** positive allocation row to `transactionNet`
3. Set `grandTotal` to `transactionNet × monthCount`

Idempotent: re-running skips rows that already match.

## Surfaces that share this number

| Feature | Field |
|---|---|
| BR list “Amount” | `grandTotal` |
| Reconciliation expected | `grandTotal` (via list API → `expectedAmount`) |
| Review outstanding / plan realization | period from allocations / `grandTotal` |
| Budget Pivot BR months | allocation per month (= transactionNet) |

## Run locally

```bash
# Preview
npx tsx scripts/migrate-br-period-grand-total.ts

# Write
npx tsx scripts/migrate-br-period-grand-total.ts --apply
```

Or `npm run db:migrate-br-period-grand-total` / with `-- --apply`.

## Run on server (dev / later prod)

1. Deploy this script.
2. Dry-run, review the log, then `--apply`.
3. Spot-check: BR detail tax breakdown vs list Amount vs reconciliation expected for a multi-month BR with VAT.

## Notes

- Prefer this backfill over deleting BRs when tax fields + allocation months exist.
- BRs with **no** allocations are skipped.
- Data Mart staging `expectedAmount` is separate; refresh staging after backfill if needed.
