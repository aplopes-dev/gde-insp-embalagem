-- =====================================================================
-- migration: multi_device
-- Altera ActivityActionType, adiciona DeviceSession e expande OpBox
-- ATENÇÃO: este SQL foi escrito à mão — Prisma não gera RENAME VALUE
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Renomear valores do enum ActivityActionType
--
-- STATUS_CHANGED → BOX_BREAK_AUTHORIZED
--   Há registros em produção com este valor (quebras de caixa).
--   ALTER TYPE RENAME VALUE atualiza o enum E as linhas existentes
--   atomicamente — não requer UPDATE manual (PostgreSQL 10+).
--
-- BOX_INSPECTION_APPROVED → BOX_PACKED
--   Nunca foi gravado em produção. Apenas renomeia o rótulo.
-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------
-- 2. Remover BOX_INSPECTION_REJECTED do enum
--
-- PostgreSQL não suporta DROP VALUE — é necessário recriar o tipo.
-- Os RENAME VALUE também ficam dentro do BEGIN/COMMIT para que toda
-- a alteração do enum seja atômica.
-- O USING "actionType"::text::"ActivityActionType" é seguro.
-- ---------------------------------------------------------------------
BEGIN;

ALTER TYPE "ActivityActionType" RENAME VALUE 'STATUS_CHANGED' TO 'BOX_BREAK_AUTHORIZED';
ALTER TYPE "ActivityActionType" RENAME VALUE 'BOX_INSPECTION_APPROVED' TO 'BOX_PACKED';

CREATE TYPE "ActivityActionType_new" AS ENUM (
  'BOX_PACKED',
  'BOX_BREAK_AUTHORIZED',
  'PRODUCT_CREATED',
  'PRODUCT_AUTHORIZED',
  'OP_STARTED',
  'OP_COMPLETED'
);

ALTER TABLE "OpActivityLog"
  ALTER COLUMN "actionType" TYPE "ActivityActionType_new"
  USING ("actionType"::text::"ActivityActionType_new");

ALTER TYPE "ActivityActionType" RENAME TO "ActivityActionType_old";
ALTER TYPE "ActivityActionType_new" RENAME TO "ActivityActionType";
DROP TYPE "ActivityActionType_old";

COMMIT;

-- ---------------------------------------------------------------------
-- 3. Nova tabela DeviceSession
--    Uma sessão ativa por device (deviceId UNIQUE).
--    qrToken one-shot para validação pelo app mobile.
-- ---------------------------------------------------------------------
CREATE TABLE "DeviceSession" (
    "id"          TEXT NOT NULL,
    "deviceId"    TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "qrToken"     TEXT NOT NULL,
    "qrExpiresAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceSession_pkey"      PRIMARY KEY ("id"),
    CONSTRAINT "DeviceSession_deviceId_key" UNIQUE ("deviceId"),
    CONSTRAINT "DeviceSession_qrToken_key"  UNIQUE ("qrToken"),
    CONSTRAINT "DeviceSession_userId_fkey"  FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------
-- 4. Novos campos em OpBox — todos nullable
--    Rows existentes recebem NULL automaticamente.
--
--    assignedDeviceId / assignedAt  → lock por device (timeout 10 min)
--    packedByUserId / packedByDeviceId → rastreabilidade pós-embalagem
-- ---------------------------------------------------------------------
ALTER TABLE "OpBox" ADD COLUMN "assignedDeviceId" TEXT;
ALTER TABLE "OpBox" ADD COLUMN "assignedAt"       TIMESTAMP(3);
ALTER TABLE "OpBox" ADD COLUMN "packedByUserId"   TEXT;
ALTER TABLE "OpBox" ADD COLUMN "packedByDeviceId" TEXT;

ALTER TABLE "OpBox"
  ADD CONSTRAINT "OpBox_packedByUserId_fkey"
  FOREIGN KEY ("packedByUserId")
  REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
