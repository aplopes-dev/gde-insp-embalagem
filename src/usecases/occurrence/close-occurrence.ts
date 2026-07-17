import type { Prisma } from "@prisma/client";
import db from "@/providers/database";

export type CloseOccurrenceInput = {
  occurrenceId: string;
  opId: number;
  closedByUserId: string;
  resolution: string;
};

export type UpdateOccurrenceInput = {
  occurrenceId: string;
  opId: number;
  title?: string;
  description?: string;
  status?: "OPEN" | "IN_PROGRESS" | "CLOSED";
  responsibleId?: string | null;
  resolution?: string | null;
  updatedByUserId: string;
};

/**
 * Fecha ocorrência (CLOSED) com texto de resolução e log OCCURRENCE_CLOSED.
 */
export async function closeOccurrence(
  input: CloseOccurrenceInput
): Promise<{ id: string; number: number }> {
  const resolution = input.resolution.trim();
  if (!resolution) {
    throw new Error("Resolução é obrigatória para fechar a ocorrência");
  }

  const existing = await db.opOccurrence.findFirst({
    where: { id: input.occurrenceId, opId: input.opId },
  });
  if (!existing) {
    throw new Error("Ocorrência não encontrada");
  }
  if (existing.status === "CLOSED") {
    throw new Error("Ocorrência já está fechada");
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.opOccurrence.update({
      where: { id: existing.id },
      data: {
        status: "CLOSED",
        resolution,
        resolvedAt: new Date(),
        resolvedById: input.closedByUserId,
      },
    });

    await tx.opActivityLog.create({
      data: {
        opId: input.opId,
        userId: input.closedByUserId,
        actionType: "OCCURRENCE_CLOSED",
        description: `Ocorrência #${updated.number} fechada`,
        occurrenceId: updated.id,
        details: {
          occurrenceId: updated.id,
          number: updated.number,
          resolution,
        },
      },
    });

    return { id: updated.id, number: updated.number };
  });
}

/**
 * Atualiza campos de ocorrência (supervisor). Fechar via status CLOSED exige resolution.
 */
export async function updateOccurrence(
  input: UpdateOccurrenceInput
): Promise<{ id: string; number: number; status: string }> {
  const existing = await db.opOccurrence.findFirst({
    where: { id: input.occurrenceId, opId: input.opId },
  });
  if (!existing) {
    throw new Error("Ocorrência não encontrada");
  }

  if (input.status === "CLOSED") {
    return closeOccurrence({
      occurrenceId: input.occurrenceId,
      opId: input.opId,
      closedByUserId: input.updatedByUserId,
      resolution: (input.resolution ?? existing.resolution ?? "").toString(),
    }).then((r) => ({ ...r, status: "CLOSED" }));
  }

  const data: Prisma.OpOccurrenceUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;
  if (input.responsibleId !== undefined) {
    data.responsible = input.responsibleId
      ? { connect: { id: input.responsibleId } }
      : { disconnect: true };
  }
  if (input.resolution !== undefined) data.resolution = input.resolution;

  const updated = await db.opOccurrence.update({
    where: { id: existing.id },
    data,
  });

  return {
    id: updated.id,
    number: updated.number,
    status: updated.status,
  };
}
