/*
  Warnings:

  - A unique constraint covering the columns `[opBoxId,code]` on the table `OpBoxBlister` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "OpBoxBlister_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "OpBoxBlister_opBoxId_code_key" ON "OpBoxBlister"("opBoxId", "code");
