/*
  Warnings:

  - You are about to drop the column `breakAuthorizerId` on the `Op` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Op" DROP CONSTRAINT "Op_breakAuthorizerId_fkey";

-- AlterTable
ALTER TABLE "Op" DROP COLUMN "breakAuthorizerId";

-- AlterTable
ALTER TABLE "OpBox" ADD COLUMN     "breakAuthorizerId" INTEGER;

-- AddForeignKey
ALTER TABLE "OpBox" ADD CONSTRAINT "OpBox_breakAuthorizerId_fkey" FOREIGN KEY ("breakAuthorizerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;
