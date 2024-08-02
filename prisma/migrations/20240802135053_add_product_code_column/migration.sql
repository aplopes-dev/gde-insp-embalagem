/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `ProductType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `ProductType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductType" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_code_key" ON "ProductType"("code");
