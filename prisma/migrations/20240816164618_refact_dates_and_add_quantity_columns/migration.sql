/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `OpBox` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `OpBoxBlister` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `OpBoxBlister` table. All the data in the column will be lost.
  - Added the required column `boxTypeId` to the `BlisterType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `limitPerBox` to the `BlisterType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finishedAt` to the `Op` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantityToProduce` to the `Op` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packedAt` to the `OpBoxBlister` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BlisterType" ADD COLUMN     "boxTypeId" INTEGER NOT NULL,
ADD COLUMN     "limitPerBox" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Op" ADD COLUMN     "finishedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "quantityToProduce" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "OpBox" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "OpBoxBlister" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "packedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "BlisterType" ADD CONSTRAINT "BlisterType_boxTypeId_fkey" FOREIGN KEY ("boxTypeId") REFERENCES "BoxType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
