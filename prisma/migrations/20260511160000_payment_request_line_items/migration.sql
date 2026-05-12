-- AlterTable: tax / totals (backfill from amount for existing rows)
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "vatPercent" DECIMAL(5,2) NOT NULL DEFAULT 11;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "whtPercent" DECIMAL(5,2) NOT NULL DEFAULT 2;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "whtAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "invoiceAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

UPDATE "payment_requests"
SET
  "totalAmount" = CASE WHEN "totalAmount" = 0 THEN "amount" ELSE "totalAmount" END,
  "invoiceAmount" = CASE WHEN "invoiceAmount" = 0 THEN "amount" ELSE "invoiceAmount" END
WHERE "totalAmount" = 0 OR "invoiceAmount" = 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_request_line_items" (
    "id" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "deduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "payment_request_line_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_request_line_items_paymentRequestId_idx" ON "payment_request_line_items"("paymentRequestId");

ALTER TABLE "payment_request_line_items" DROP CONSTRAINT IF EXISTS "payment_request_line_items_paymentRequestId_fkey";
ALTER TABLE "payment_request_line_items" ADD CONSTRAINT "payment_request_line_items_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
