-- AlterTable: the default is volatile, so every existing request gets its own token.
ALTER TABLE "CleaningRequest" ADD COLUMN "statusToken" TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');

-- CreateIndex
CREATE UNIQUE INDEX "CleaningRequest_statusToken_key" ON "CleaningRequest"("statusToken");
