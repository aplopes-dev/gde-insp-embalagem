-- Add optional column to identify which glasses (INSTANCE_ID) inspected the OP
ALTER TABLE "Op" ADD COLUMN IF NOT EXISTS "oculosInstanceId" TEXT;

-- Optional index for filtering by instance
CREATE INDEX IF NOT EXISTS "Op_oculosInstanceId_idx" ON "Op"("oculosInstanceId");

