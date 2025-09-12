-- AlterTable
ALTER TABLE "OpBox" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "finalizedById" INTEGER;

-- AlterTable
ALTER TABLE "OpBoxBlister" ADD COLUMN     "createdById" INTEGER;

-- AddForeignKey
ALTER TABLE "OpBox" ADD CONSTRAINT "OpBox_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpBox" ADD CONSTRAINT "OpBox_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpBoxBlister" ADD CONSTRAINT "OpBoxBlister_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
