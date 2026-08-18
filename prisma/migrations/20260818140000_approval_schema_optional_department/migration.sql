-- Allow approval schemas to apply to every department (All Department).
-- Null departmentId means the schema is available when creating BP/BR/PR
-- regardless of the selected department.
ALTER TABLE "approval_schemas" ALTER COLUMN "departmentId" DROP NOT NULL;
