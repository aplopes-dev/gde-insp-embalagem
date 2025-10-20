-- CreateEnum
CREATE TYPE "ActivityActionType" AS ENUM ('BOX_INSPECTION_APPROVED', 'BOX_INSPECTION_REJECTED', 'PRODUCT_CREATED', 'PRODUCT_AUTHORIZED', 'STATUS_CHANGED', 'OP_STARTED', 'OP_COMPLETED');

-- AlterTable
CREATE SEQUENCE producttype_id_seq;
ALTER TABLE "ProductType" ALTER COLUMN "id" SET DEFAULT nextval('producttype_id_seq');
ALTER SEQUENCE producttype_id_seq OWNED BY "ProductType"."id";

-- CreateTable
CREATE TABLE "OpActivityLog" (
    "id" TEXT NOT NULL,
    "opId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" "ActivityActionType" NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB,
    "boxId" TEXT,
    "productId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpActivityLog_opId_idx" ON "OpActivityLog"("opId");

-- CreateIndex
CREATE INDEX "OpActivityLog_userId_idx" ON "OpActivityLog"("userId");

-- CreateIndex
CREATE INDEX "OpActivityLog_createdAt_idx" ON "OpActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "OpActivityLog" ADD CONSTRAINT "OpActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
