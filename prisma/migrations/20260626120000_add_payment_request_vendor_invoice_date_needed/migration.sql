ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "vendorInvoiceNo" TEXT;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "dateNeeded" TIMESTAMP(3);
