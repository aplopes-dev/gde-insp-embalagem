-- AlterTable
ALTER TABLE "Op" ADD COLUMN     "breakAuthorizerId" INTEGER;

-- CreateTable
CREATE TABLE "Manager" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Manager_email_key" ON "Manager"("email");

-- AddForeignKey
ALTER TABLE "Op" ADD CONSTRAINT "Op_breakAuthorizerId_fkey" FOREIGN KEY ("breakAuthorizerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;
