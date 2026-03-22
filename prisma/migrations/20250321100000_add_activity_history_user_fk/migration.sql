-- AddForeignKey
ALTER TABLE "activity_histories" ADD CONSTRAINT "activity_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
