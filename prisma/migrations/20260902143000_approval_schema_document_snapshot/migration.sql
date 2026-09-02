-- Freeze the chosen approval schema onto BP / BR / PR so master edits cannot
-- rewrite in-flight or historical documents. Existing rows are backfilled from
-- the live schema at migrate time.

ALTER TABLE "budget_plans" ADD COLUMN "approvalSchemaSnapshot" JSONB;
ALTER TABLE "budget_requests" ADD COLUMN "approvalSchemaSnapshot" JSONB;
ALTER TABLE "payment_requests" ADD COLUMN "approvalSchemaSnapshot" JSONB;

CREATE TEMP TABLE "approval_schema_snapshots" AS
WITH level_json AS (
  SELECT
    l."schemaId" AS schema_id,
    l."stepOrder" AS step_order,
    jsonb_build_object(
      'id', l."schemaId" || ':' || l."stepOrder"::text,
      'stepOrder', l."stepOrder",
      'levelType', l."levelType",
      'roleId', l."roleId",
      'roleCode', r."roleCode",
      'roleName', r."roleName",
      'picUserIds', COALESCE((
        SELECT jsonb_agg(p."userId" ORDER BY p."userId")
        FROM "approval_level_pics" p
        WHERE p."approvalLevelId" = l.id
      ), '[]'::jsonb),
      'pics', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'userId', p."userId",
            'user', jsonb_build_object(
              'id', u.id,
              'name', u.name,
              'employeeId', u."employeeId"
            )
          )
          ORDER BY u.name
        )
        FROM "approval_level_pics" p
        JOIN "users" u ON u.id = p."userId"
        WHERE p."approvalLevelId" = l.id
      ), '[]'::jsonb)
    ) AS level_obj
  FROM "approval_levels" l
  JOIN "roles" r ON r.id = l."roleId"
)
SELECT
  s.id,
  jsonb_build_object(
    'schemaId', s.id,
    'code', s.code,
    'name', s.name,
    'type', s.type,
    'capturedAt', NOW(),
    'levels', COALESCE((
      SELECT jsonb_agg(lj.level_obj ORDER BY lj.step_order)
      FROM level_json lj
      WHERE lj.schema_id = s.id
    ), '[]'::jsonb)
  ) AS snapshot
FROM "approval_schemas" s;

UPDATE "budget_plans" bp
SET "approvalSchemaSnapshot" = s.snapshot
FROM "approval_schema_snapshots" s
WHERE bp."approvalSchemaId" = s.id
  AND bp."approvalSchemaSnapshot" IS NULL;

UPDATE "budget_requests" br
SET "approvalSchemaSnapshot" = s.snapshot
FROM "approval_schema_snapshots" s
WHERE br."approvalSchemaId" = s.id
  AND br."approvalSchemaSnapshot" IS NULL;

UPDATE "payment_requests" pr
SET "approvalSchemaSnapshot" = s.snapshot
FROM "approval_schema_snapshots" s
WHERE pr."approvalSchemaId" = s.id
  AND pr."approvalSchemaSnapshot" IS NULL;

DROP TABLE "approval_schema_snapshots";
