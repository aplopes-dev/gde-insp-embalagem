/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `BlisterType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `BoxType` will be added. If there are existing duplicate values, this will fail.
  - Made the column `code` on table `BlisterType` required. This step will fail if there are existing NULL values in that column.
  - Made the column `code` on table `BoxType` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "BlisterType" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable
ALTER TABLE "BoxType" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BlisterType_code_key" ON "BlisterType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BoxType_code_key" ON "BoxType"("code");
