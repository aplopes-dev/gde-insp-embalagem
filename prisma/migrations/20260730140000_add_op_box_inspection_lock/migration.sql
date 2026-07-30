-- AlterTable
ALTER TABLE "OpBox" ADD COLUMN "inspectionLockedByUserId" TEXT;
ALTER TABLE "OpBox" ADD COLUMN "inspectionLockedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "OpBox_opId_packedAt_inspectionLockedByUserId_idx" ON "OpBox"("opId", "packedAt", "inspectionLockedByUserId");
