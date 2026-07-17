import db from "@/providers/database";
import {
  AUTO_OCCURRENCE_THRESHOLD,
  DETECTION_DEBOUNCE_MS,
  shouldOpenOccurrence,
  shouldPersistDetection,
} from "@/lib/occurrence-rules";
import { createOccurrence } from "@/usecases/occurrence/create-occurrence";

export type PersistDetectionInput = {
  opId: number;
  userId: string;
  boxId?: string | null;
  step: string;
  status: "INVALID" | "TIMEOUT";
  reason?: string | null;
  confidence?: number | null;
  defectLabels?: string[];
  deviceId?: string | null;
  workerId?: string | null;
  /** Nome base ou com .jpg — normalizado para *.jpg */
  imageFilename?: string | null;
  /** Pasta MinIO/disco YYYY-MM-DD */
  storagePath?: string | null;
  capturedAt?: Date | string | null;
  extraDetails?: Record<string, unknown>;
};

export type PersistDetectionResult = {
  persisted: boolean;
  skippedReason?: "debounce" | "unsupported_status";
  activityLogId?: string;
  imageId?: string;
  occurrenceId?: string;
};

function normalizeFilename(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  const trimmed = name.trim();
  return trimmed.endsWith(".jpg") ? trimmed : `${trimmed}.jpg`;
}

function toDate(value: Date | string | null | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function defaultStoragePath(capturedAt: Date): string {
  const y = capturedAt.getFullYear();
  const m = String(capturedAt.getMonth() + 1).padStart(2, "0");
  const d = String(capturedAt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Persiste INVALID/TIMEOUT em OpActivityLog (+ InspectionImage quando houver filename).
 * Aplica debounce técnico e pode abrir OpOccurrence ao atingir o limiar.
 */
export async function persistDetectionEvent(
  input: PersistDetectionInput
): Promise<PersistDetectionResult> {
  if (input.status !== "INVALID" && input.status !== "TIMEOUT") {
    return { persisted: false, skippedReason: "unsupported_status" };
  }

  const actionType =
    input.status === "INVALID" ? "DETECTION_INVALID" : "DETECTION_TIMEOUT";

  const last = await db.opActivityLog.findFirst({
    where: {
      opId: input.opId,
      actionType,
      boxId: input.boxId ?? null,
      details: {
        path: ["step"],
        equals: input.step,
      },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const now = Date.now();
  if (
    !shouldPersistDetection(
      last?.createdAt?.getTime() ?? null,
      now,
      DETECTION_DEBOUNCE_MS
    )
  ) {
    return { persisted: false, skippedReason: "debounce" };
  }

  const capturedAt = toDate(input.capturedAt);
  const filename = normalizeFilename(input.imageFilename);
  const storagePath =
    input.storagePath?.trim() || defaultStoragePath(capturedAt);

  const description =
    input.status === "INVALID"
      ? `Detecção inválida (${input.step})${input.reason ? `: ${input.reason}` : ""}`
      : `Timeout de detecção (${input.step})`;

  const activityLog = await db.opActivityLog.create({
    data: {
      opId: input.opId,
      userId: input.userId,
      actionType,
      description,
      boxId: input.boxId ?? null,
      detectionStatus: input.status,
      imageFilename: filename,
      storagePath: filename ? storagePath : null,
      confidence: input.confidence ?? null,
      deviceId: input.deviceId ?? null,
      details: {
        step: input.step,
        reason: input.reason ?? null,
        defectLabels: input.defectLabels ?? [],
        workerId: input.workerId ?? null,
        ...(input.extraDetails ?? {}),
      },
    },
  });

  let imageId: string | undefined;
  if (filename) {
    const image = await db.inspectionImage.create({
      data: {
        opId: input.opId,
        opBoxId: input.boxId ?? null,
        activityLogId: activityLog.id,
        filename,
        storagePath,
        detectionStatus: input.status,
        detectionStep: input.step,
        confidence: input.confidence ?? null,
        defectLabels: input.defectLabels ?? [],
        deviceId: input.deviceId ?? null,
        workerId: input.workerId ?? null,
        capturedAt,
      },
    });
    imageId = image.id;
  }

  let occurrenceId: string | undefined;

  if (input.status === "INVALID") {
    const recent = await db.opActivityLog.findMany({
      where: {
        opId: input.opId,
        boxId: input.boxId ?? null,
      },
      orderBy: { createdAt: "desc" },
      take: AUTO_OCCURRENCE_THRESHOLD + 5,
      select: {
        id: true,
        actionType: true,
        details: true,
      },
    });

    let consecutive = 0;
    const linkIds: string[] = [];
    for (const row of recent) {
      const step = (row.details as { step?: string } | null)?.step;
      if (row.actionType === "DETECTION_INVALID" && step === input.step) {
        consecutive += 1;
        linkIds.push(row.id);
        if (consecutive >= AUTO_OCCURRENCE_THRESHOLD) break;
      } else {
        break;
      }
    }

    if (shouldOpenOccurrence(consecutive)) {
      const existingOpen = await db.opOccurrence.findFirst({
        where: {
          opId: input.opId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
          details: {
            path: ["autoKey"],
            equals: `${input.boxId ?? "_"}|${input.step}`,
          },
        },
        select: { id: true },
      });

      if (!existingOpen) {
        const created = await createOccurrence({
          opId: input.opId,
          openedByUserId: input.userId,
          boxId: input.boxId,
          title: `Alertas repetidos — ${input.step}`,
          description: `Detectados ${consecutive} INVALID consecutivos na caixa ${input.boxId ?? "—"} (step ${input.step}).`,
          details: {
            autoKey: `${input.boxId ?? "_"}|${input.step}`,
            step: input.step,
            boxId: input.boxId ?? null,
            threshold: AUTO_OCCURRENCE_THRESHOLD,
            source: "auto_detection",
          },
          linkActivityLogIds: linkIds,
          linkImageIds: imageId ? [imageId] : undefined,
        });
        occurrenceId = created.id;
      } else {
        occurrenceId = existingOpen.id;
        await db.opActivityLog.updateMany({
          where: { id: { in: linkIds } },
          data: { occurrenceId: existingOpen.id },
        });
        if (imageId) {
          await db.inspectionImage.updateMany({
            where: { id: imageId },
            data: { occurrenceId: existingOpen.id },
          });
        }
      }
    }
  }

  return {
    persisted: true,
    activityLogId: activityLog.id,
    imageId,
    occurrenceId,
  };
}
