-- Add the new `code` column.
--
-- Done in three steps because the column is NOT NULL UNIQUE and the table may
-- already contain rows: add nullable, backfill with a deterministic
-- auto-generated code derived from the existing `id`, then promote to NOT NULL
-- and add the unique index. Re-running `prisma db seed` afterwards will
-- overwrite these placeholder codes with the friendly ones declared in
-- `prisma/seed.ts` (e.g. `BP-PRIMARY`, `BR-3STEP`).

-- 1. Add the column (nullable so the UPDATE below has room to work).
ALTER TABLE "approval_schemas" ADD COLUMN "code" TEXT;

-- 2. Backfill: `AS-` + uppercase last 8 chars of the row id. Last 8 chars of a
--    cuid are random enough to avoid collisions in any realistic dataset.
UPDATE "approval_schemas"
SET "code" = 'AS-' || UPPER(RIGHT("id", 8))
WHERE "code" IS NULL;

-- 3. Lock the column down: NOT NULL + UNIQUE so the application's invariants
--    match the schema declaration.
ALTER TABLE "approval_schemas" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "approval_schemas_code_key" ON "approval_schemas"("code");
