/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `BlisterType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `BoxType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `BlisterType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `BoxType` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BlisterType" DROP CONSTRAINT "BlisterType_boxTypeId_fkey";

-- AlterTable
ALTER TABLE "BlisterType" ADD COLUMN     "code" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "BlisterType_id_seq";

-- AlterTable
ALTER TABLE "BoxType" ADD COLUMN     "code" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "BoxType_id_seq";

-- AlterTable
ALTER TABLE "Op" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Op_id_seq";

-- AlterTable
ALTER TABLE "ProductType" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "ProductType_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "BlisterType_code_key" ON "BlisterType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BoxType_code_key" ON "BoxType"("code");
