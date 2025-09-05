-- CreateEnum
CREATE TYPE "OculosStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateTable
CREATE TABLE "OculosInstance" (
  "id" SERIAL PRIMARY KEY,
  "referencia" TEXT NOT NULL UNIQUE,
  "nome" TEXT NOT NULL,
  "status" "OculosStatus" NOT NULL DEFAULT 'ATIVO',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AddRelation: Op.oculosInstanceId from TEXT to INT and FK
ALTER TABLE "Op" ADD COLUMN IF NOT EXISTS "oculosInstanceId_tmp" INTEGER;

-- Try to map existing TEXT instance IDs to OculosInstance by referencia (best-effort)
-- Create OculosInstance from distinct existing values
INSERT INTO "OculosInstance" ("referencia", "nome", "status", "createdAt", "updatedAt")
SELECT DISTINCT COALESCE("oculosInstanceId", 'rw-ad8e5b1ba2735712') as "referencia", 'Bancada 1' as "nome", 'ATIVO'::"OculosStatus", NOW(), NOW()
FROM "Op"
WHERE "oculosInstanceId" IS NOT NULL AND "oculosInstanceId" <> ''
ON CONFLICT ("referencia") DO NOTHING;

-- Fill temp column with ids
UPDATE "Op" o SET "oculosInstanceId_tmp" = oi.id
FROM "OculosInstance" oi
WHERE o."oculosInstanceId" = oi.referencia;

-- Drop old index if exists
DROP INDEX IF EXISTS "Op_oculosInstanceId_idx";

-- Drop old TEXT column and rename temp
ALTER TABLE "Op" DROP COLUMN IF EXISTS "oculosInstanceId";
ALTER TABLE "Op" RENAME COLUMN "oculosInstanceId_tmp" TO "oculosInstanceId";

-- Add FK and index
ALTER TABLE "Op" ADD CONSTRAINT "Op_oculosInstanceId_fkey" FOREIGN KEY ("oculosInstanceId") REFERENCES "OculosInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Op_oculosInstanceId_idx" ON "Op"("oculosInstanceId");

