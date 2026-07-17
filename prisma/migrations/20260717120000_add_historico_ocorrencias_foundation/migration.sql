-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "DetectionStatus" AS ENUM ('VALID', 'INVALID', 'TIMEOUT', 'ERROR');

-- AlterEnum UserRole
ALTER TYPE "UserRole" ADD VALUE 'AUDITOR';

-- AlterEnum ActivityActionType
ALTER TYPE "ActivityActionType" ADD VALUE 'DETECTION_INVALID';
ALTER TYPE "ActivityActionType" ADD VALUE 'DETECTION_TIMEOUT';
ALTER TYPE "ActivityActionType" ADD VALUE 'OCCURRENCE_OPENED';
ALTER TYPE "ActivityActionType" ADD VALUE 'OCCURRENCE_CLOSED';

-- CreateTable OpOccurrence
CREATE TABLE "OpOccurrence" (
    "id" TEXT NOT NULL,
    "opId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsibleId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolution" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable InspectionImage
CREATE TABLE "InspectionImage" (
    "id" TEXT NOT NULL,
    "opId" INTEGER NOT NULL,
    "opBoxId" TEXT,
    "occurrenceId" TEXT,
    "activityLogId" TEXT,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "detectionStatus" "DetectionStatus" NOT NULL,
    "detectionStep" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "defectLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deviceId" TEXT,
    "workerId" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionImage_pkey" PRIMARY KEY ("id")
);

-- AlterTable OpActivityLog
ALTER TABLE "OpActivityLog" ADD COLUMN "occurrenceId" TEXT;
ALTER TABLE "OpActivityLog" ADD COLUMN "detectionStatus" "DetectionStatus";
ALTER TABLE "OpActivityLog" ADD COLUMN "imageFilename" TEXT;
ALTER TABLE "OpActivityLog" ADD COLUMN "storagePath" TEXT;
ALTER TABLE "OpActivityLog" ADD COLUMN "confidence" DOUBLE PRECISION;
ALTER TABLE "OpActivityLog" ADD COLUMN "deviceId" TEXT;

-- Indexes OpOccurrence
CREATE UNIQUE INDEX "OpOccurrence_opId_number_key" ON "OpOccurrence"("opId", "number");
CREATE INDEX "OpOccurrence_opId_idx" ON "OpOccurrence"("opId");
CREATE INDEX "OpOccurrence_status_idx" ON "OpOccurrence"("status");
CREATE INDEX "OpOccurrence_createdAt_idx" ON "OpOccurrence"("createdAt");

-- Indexes InspectionImage
CREATE INDEX "InspectionImage_opId_idx" ON "InspectionImage"("opId");
CREATE INDEX "InspectionImage_detectionStatus_idx" ON "InspectionImage"("detectionStatus");
CREATE INDEX "InspectionImage_capturedAt_idx" ON "InspectionImage"("capturedAt");
CREATE INDEX "InspectionImage_occurrenceId_idx" ON "InspectionImage"("occurrenceId");

-- Indexes OpActivityLog extensions
CREATE INDEX "OpActivityLog_detectionStatus_idx" ON "OpActivityLog"("detectionStatus");
CREATE INDEX "OpActivityLog_occurrenceId_idx" ON "OpActivityLog"("occurrenceId");

-- ForeignKeys OpOccurrence
ALTER TABLE "OpOccurrence" ADD CONSTRAINT "OpOccurrence_opId_fkey" FOREIGN KEY ("opId") REFERENCES "Op"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpOccurrence" ADD CONSTRAINT "OpOccurrence_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpOccurrence" ADD CONSTRAINT "OpOccurrence_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ForeignKeys InspectionImage
ALTER TABLE "InspectionImage" ADD CONSTRAINT "InspectionImage_opId_fkey" FOREIGN KEY ("opId") REFERENCES "Op"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InspectionImage" ADD CONSTRAINT "InspectionImage_opBoxId_fkey" FOREIGN KEY ("opBoxId") REFERENCES "OpBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InspectionImage" ADD CONSTRAINT "InspectionImage_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "OpOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InspectionImage" ADD CONSTRAINT "InspectionImage_activityLogId_fkey" FOREIGN KEY ("activityLogId") REFERENCES "OpActivityLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ForeignKeys OpActivityLog.occurrenceId
ALTER TABLE "OpActivityLog" ADD CONSTRAINT "OpActivityLog_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "OpOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
