CREATE TABLE IF NOT EXISTS "budget_request_comments" (
  "id" TEXT NOT NULL,
  "budgetRequestId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "budget_request_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "budget_request_comment_mentions" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "budget_request_comment_mentions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "budget_request_comments_budgetRequestId_createdAt_idx"
  ON "budget_request_comments"("budgetRequestId", "createdAt");

CREATE INDEX IF NOT EXISTS "budget_request_comments_userId_idx"
  ON "budget_request_comments"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "budget_request_comment_mentions_commentId_userId_key"
  ON "budget_request_comment_mentions"("commentId", "userId");

CREATE INDEX IF NOT EXISTS "budget_request_comment_mentions_userId_idx"
  ON "budget_request_comment_mentions"("userId");

ALTER TABLE "budget_request_comments"
  ADD CONSTRAINT "budget_request_comments_budgetRequestId_fkey"
  FOREIGN KEY ("budgetRequestId") REFERENCES "budget_requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_request_comments"
  ADD CONSTRAINT "budget_request_comments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_request_comment_mentions"
  ADD CONSTRAINT "budget_request_comment_mentions_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "budget_request_comments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_request_comment_mentions"
  ADD CONSTRAINT "budget_request_comment_mentions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
