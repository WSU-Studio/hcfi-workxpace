-- FP&A guideline fields: interface layer, invoice/PR metadata, driver math, approved/plan linkage
ALTER TABLE "data_mart_staging" ADD COLUMN "data_interface_source" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "expense_type_fp" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "journal_no" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "voucher_egl" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "invoice_no" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "invoice_date" TIMESTAMP(3);
ALTER TABLE "data_mart_staging" ADD COLUMN "payment_request_date" TIMESTAMP(3);
ALTER TABLE "data_mart_staging" ADD COLUMN "requested_by_email" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "project_name" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "budget_request_approved_at" TIMESTAMP(3);
ALTER TABLE "data_mart_staging" ADD COLUMN "plan_amount" DECIMAL(18,2);
ALTER TABLE "data_mart_staging" ADD COLUMN "cost_driver_metric" DECIMAL(18,4);
ALTER TABLE "data_mart_staging" ADD COLUMN "cost_per_unit" DECIMAL(18,6);

CREATE INDEX "data_mart_staging_invoice_no_idx" ON "data_mart_staging"("invoice_no");
