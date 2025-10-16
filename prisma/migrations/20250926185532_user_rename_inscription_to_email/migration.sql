/*
  Rename User.inscription -> User.email preserving data
*/

-- 1) Add new column (nullable primeiro para permitir backfill)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- 2) Copiar dados existentes
UPDATE "User" SET "email" = "inscription" WHERE "email" IS NULL;

-- 3) Tornar NOT NULL
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

-- 4) Índice único para email
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- 5) Remover índice antigo de inscription, se existir
DROP INDEX IF EXISTS "User_inscription_key";

-- 6) Remover coluna antiga
ALTER TABLE "User" DROP COLUMN IF EXISTS "inscription";
