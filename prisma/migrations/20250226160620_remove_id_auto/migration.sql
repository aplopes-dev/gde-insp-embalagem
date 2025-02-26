-- AlterTable
ALTER TABLE "BlisterType" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "BlisterType_id_seq";

-- AlterTable
ALTER TABLE "BoxType" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "BoxType_id_seq";

-- AlterTable
ALTER TABLE "Op" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Op_id_seq";

-- AlterTable
ALTER TABLE "ProductType" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "ProductType_id_seq";
