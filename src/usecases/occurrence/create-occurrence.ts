import type { Prisma } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";
import db from "@/providers/database";

export type CreateOccurrenceInput = {
  opId: number;
  title: string;
  description: string;
  responsibleId?: string | null;
  details?: Prisma.InputJsonValue | null;
  linkActivityLogIds?: string[];
  linkImageIds?: string[];
  openedByUserId: string;
  boxId?: string | null;
};

export type CreateOccurrenceResult = {
  id: string;
  number: number;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof PrismaNS.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Cria ocorrência formal numerada por OP e registra OCCURRENCE_OPENED.
 * Retry em colisão de @@unique([opId, number]).
 */
export async function createOccurrence(
  input: CreateOccurrenceInput
): Promise<CreateOccurrenceResult> {
  const maxAttempts = 5;
  let occurrence: { id: string; number: number } | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const last = await db.opOccurrence.aggregate({
      where: { opId: input.opId },
      _max: { number: true },
    });
    const number = (last._max.number ?? 0) + 1;

    try {
      occurrence = await db.opOccurrence.create({
        data: {
          opId: input.opId,
          number,
          title: input.title,
          description: input.description,
          responsibleId: input.responsibleId ?? null,
          details: input.details ?? undefined,
          status: "OPEN",
        },
      });
      break;
    } catch (error) {
      if (isUniqueViolation(error) && attempt < maxAttempts - 1) {
        continue;
      }
      throw error;
    }
  }

  if (!occurrence) {
    throw new Error("Não foi possível criar ocorrência");
  }

  if (input.linkActivityLogIds?.length) {
    await db.opActivityLog.updateMany({
      where: { id: { in: input.linkActivityLogIds } },
      data: { occurrenceId: occurrence.id },
    });
  }

  if (input.linkImageIds?.length) {
    await db.inspectionImage.updateMany({
      where: { id: { in: input.linkImageIds } },
      data: { occurrenceId: occurrence.id },
    });
  }

  await db.opActivityLog.create({
    data: {
      opId: input.opId,
      userId: input.openedByUserId,
      actionType: "OCCURRENCE_OPENED",
      description: `Ocorrência #${occurrence.number} aberta: ${input.title}`,
      boxId: input.boxId ?? null,
      occurrenceId: occurrence.id,
      details: {
        occurrenceId: occurrence.id,
        number: occurrence.number,
        ...(typeof input.details === "object" &&
        input.details !== null &&
        !Array.isArray(input.details)
          ? (input.details as Record<string, unknown>)
          : {}),
      },
    },
  });

  return { id: occurrence.id, number: occurrence.number };
}
