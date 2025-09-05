/*
  Warnings:

  - The `status` column on the `Op` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `OpBox` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `status` column on the `OpBox` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `OpBoxBlister` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- CreateEnum
CREATE TYPE "OpStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OpBoxStatus" AS ENUM ('PENDING', 'PACKAGED', 'PACKAGED_W_BREAK');

-- DropForeignKey
ALTER TABLE "OpBoxBlister" DROP CONSTRAINT "OpBoxBlister_opBoxId_fkey";

-- DropIndex
DROP INDEX "Op_oculosInstanceId_idx";

-- AlterTable
ALTER TABLE "OculosInstance" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Op" DROP COLUMN "status",
ADD COLUMN     "status" "OpStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "OpBox" DROP CONSTRAINT "OpBox_pkey",
ADD COLUMN     "barCode" TEXT,
ADD COLUMN     "barCodeGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "claimedByInstanceId" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "OpBoxStatus" NOT NULL DEFAULT 'PENDING',
ADD CONSTRAINT "OpBox_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "OpBox_id_seq";

-- AlterTable
ALTER TABLE "OpBoxBlister" DROP CONSTRAINT "OpBoxBlister_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "opBoxId" SET DATA TYPE TEXT,
ADD CONSTRAINT "OpBoxBlister_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "OpBoxBlister_id_seq";

-- AddForeignKey
ALTER TABLE "OpBoxBlister" ADD CONSTRAINT "OpBoxBlister_opBoxId_fkey" FOREIGN KEY ("opBoxId") REFERENCES "OpBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
