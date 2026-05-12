-- Budget request / plan dimensions for Data Mart (filtering + display alongside Confins GL)
ALTER TABLE "data_mart_staging" ADD COLUMN "budget_plan_code" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "budget_request_subject" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "expense_category" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "category_key_index" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "cost_center" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "account_number_coa" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "opex_type" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "opex_allocation" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "budget_request_type" TEXT;
ALTER TABLE "data_mart_staging" ADD COLUMN "project_code" TEXT;

CREATE INDEX "data_mart_staging_expense_category_idx" ON "data_mart_staging"("expense_category");
CREATE INDEX "data_mart_staging_category_key_index_idx" ON "data_mart_staging"("category_key_index");
CREATE INDEX "data_mart_staging_project_code_idx" ON "data_mart_staging"("project_code");
