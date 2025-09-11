/*
  Warnings:

  - You are about to drop the column `code` on the `ProductType` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ProductType_code_key";

-- AlterTable
ALTER TABLE "ProductType" DROP COLUMN "code";
