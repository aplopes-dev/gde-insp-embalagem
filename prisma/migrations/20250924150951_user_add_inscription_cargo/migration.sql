/*
  Warnings:

  - A unique constraint covering the columns `[inscription]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `inscription` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "inscription" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_inscription_key" ON "User"("inscription");
