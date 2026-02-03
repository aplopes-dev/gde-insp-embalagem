-- AlterTable
ALTER TABLE "OpBox" ADD COLUMN     "packedByUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'OPERADOR';

-- AddForeignKey
ALTER TABLE "OpBox" ADD CONSTRAINT "OpBox_packedByUserId_fkey" FOREIGN KEY ("packedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
