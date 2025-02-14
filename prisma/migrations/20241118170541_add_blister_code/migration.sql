/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `OpBoxBlister` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `OpBoxBlister` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OpBoxBlister" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OpBoxBlister_code_key" ON "OpBoxBlister"("code");
