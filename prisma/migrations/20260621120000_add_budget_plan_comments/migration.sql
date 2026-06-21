CREATE TABLE IF NOT EXISTS "budget_plan_comments" (
  "id" TEXT NOT NULL,
  "budgetPlanId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "budget_plan_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "budget_plan_comment_mentions" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "budget_plan_comment_mentions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "budget_plan_comments_budgetPlanId_createdAt_idx"
  ON "budget_plan_comments"("budgetPlanId", "createdAt");

CREATE INDEX IF NOT EXISTS "budget_plan_comments_userId_idx"
  ON "budget_plan_comments"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "budget_plan_comment_mentions_commentId_userId_key"
  ON "budget_plan_comment_mentions"("commentId", "userId");

CREATE INDEX IF NOT EXISTS "budget_plan_comment_mentions_userId_idx"
  ON "budget_plan_comment_mentions"("userId");

ALTER TABLE "budget_plan_comments"
  ADD CONSTRAINT "budget_plan_comments_budgetPlanId_fkey"
  FOREIGN KEY ("budgetPlanId") REFERENCES "budget_plans"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_plan_comments"
  ADD CONSTRAINT "budget_plan_comments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_plan_comment_mentions"
  ADD CONSTRAINT "budget_plan_comment_mentions_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "budget_plan_comments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_plan_comment_mentions"
  ADD CONSTRAINT "budget_plan_comment_mentions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
