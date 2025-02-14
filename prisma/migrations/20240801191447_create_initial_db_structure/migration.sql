-- CreateTable
CREATE TABLE "BoxType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoxType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlisterType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slots" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlisterType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Op" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "boxTypeId" INTEGER NOT NULL,
    "blisterTypeId" INTEGER NOT NULL,
    "productTypeId" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Op_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpBox" (
    "id" SERIAL NOT NULL,
    "opId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "packedAt" TIMESTAMP(3),

    CONSTRAINT "OpBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpBoxBlister" (
    "id" SERIAL NOT NULL,
    "opBoxId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpBoxBlister_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Op" ADD CONSTRAINT "Op_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Op" ADD CONSTRAINT "Op_boxTypeId_fkey" FOREIGN KEY ("boxTypeId") REFERENCES "BoxType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Op" ADD CONSTRAINT "Op_blisterTypeId_fkey" FOREIGN KEY ("blisterTypeId") REFERENCES "BlisterType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpBox" ADD CONSTRAINT "OpBox_opId_fkey" FOREIGN KEY ("opId") REFERENCES "Op"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpBoxBlister" ADD CONSTRAINT "OpBoxBlister_opBoxId_fkey" FOREIGN KEY ("opBoxId") REFERENCES "OpBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
