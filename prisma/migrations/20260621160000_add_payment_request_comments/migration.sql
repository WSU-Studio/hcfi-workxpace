CREATE TABLE IF NOT EXISTS "payment_request_comments" (
  "id" TEXT NOT NULL,
  "paymentRequestId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_request_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payment_request_comment_mentions" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_request_comment_mentions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_request_comments_paymentRequestId_createdAt_idx"
  ON "payment_request_comments"("paymentRequestId", "createdAt");

CREATE INDEX IF NOT EXISTS "payment_request_comments_userId_idx"
  ON "payment_request_comments"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "payment_request_comment_mentions_commentId_userId_key"
  ON "payment_request_comment_mentions"("commentId", "userId");

CREATE INDEX IF NOT EXISTS "payment_request_comment_mentions_userId_idx"
  ON "payment_request_comment_mentions"("userId");

ALTER TABLE "payment_request_comments"
  ADD CONSTRAINT "payment_request_comments_paymentRequestId_fkey"
  FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_request_comments"
  ADD CONSTRAINT "payment_request_comments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_request_comment_mentions"
  ADD CONSTRAINT "payment_request_comment_mentions_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "payment_request_comments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_request_comment_mentions"
  ADD CONSTRAINT "payment_request_comment_mentions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
