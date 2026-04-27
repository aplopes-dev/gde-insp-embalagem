-- CreateTable
CREATE TABLE "gde_message_audit" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "op_id" TEXT,
    "device_id" TEXT,
    "direction" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "source" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gde_message_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gde_message_audit_message_id_idx" ON "gde_message_audit"("message_id");

-- CreateIndex
CREATE INDEX "gde_message_audit_op_id_idx" ON "gde_message_audit"("op_id");

-- CreateIndex
CREATE INDEX "gde_message_audit_device_id_idx" ON "gde_message_audit"("device_id");

-- CreateIndex
CREATE INDEX "gde_message_audit_created_at_idx" ON "gde_message_audit"("created_at");
