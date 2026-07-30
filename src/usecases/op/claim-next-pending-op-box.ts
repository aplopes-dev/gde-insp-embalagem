import db from "@/providers/database";
import {
  compareOpBoxCodeAsc,
  OpBoxWithBlisters,
  sortOpBoxBlisters,
} from "@/usecases/op/find-next-pending-op-box";

/** Tempo máximo de lock de inspeção sem renovação (minutos). */
export const INSPECTION_LOCK_TTL_MS = 30 * 60 * 1000;

async function loadBoxWithBlisters(
  boxId: string
): Promise<OpBoxWithBlisters | undefined> {
  const box = await db.opBox.findUnique({
    where: { id: boxId },
    include: {
      OpBoxBlister: { orderBy: { id: "asc" } },
    },
  });
  if (!box || box.packedAt != null) return undefined;
  return {
    ...box,
    OpBoxBlister: sortOpBoxBlisters(box.OpBoxBlister),
  };
}

/**
 * Reserva atomicamente a próxima caixa pendente para o operador.
 * - Renova lock se a caixa já estiver com o mesmo user.
 * - Ignora locks expirados.
 * - Evita dois operadores na mesma boxId (causa da divergência 1851454).
 */
export async function claimNextPendingOpBox(
  opId: number,
  userId: string,
  now: Date = new Date()
): Promise<OpBoxWithBlisters | undefined> {
  const expireBefore = new Date(now.getTime() - INSPECTION_LOCK_TTL_MS);

  const ownLocked = await db.opBox.findFirst({
    where: {
      opId,
      packedAt: null,
      inspectionLockedByUserId: userId,
    },
    select: { id: true, code: true },
  });

  if (ownLocked) {
    await db.opBox.update({
      where: { id: ownLocked.id },
      data: { inspectionLockedAt: now },
    });
    return loadBoxWithBlisters(ownLocked.id);
  }

  const pending = await db.opBox.findMany({
    where: { opId, packedAt: null },
    select: { id: true, code: true },
  });

  const ordered = [...pending].sort((a, b) =>
    compareOpBoxCodeAsc(a.code, b.code)
  );

  for (const candidate of ordered) {
    const claimed = await db.opBox.updateMany({
      where: {
        id: candidate.id,
        packedAt: null,
        OR: [
          { inspectionLockedByUserId: null },
          { inspectionLockedAt: null },
          { inspectionLockedAt: { lt: expireBefore } },
          { inspectionLockedByUserId: userId },
        ],
      },
      data: {
        inspectionLockedByUserId: userId,
        inspectionLockedAt: now,
      },
    });

    if (claimed.count === 1) {
      return loadBoxWithBlisters(candidate.id);
    }
  }

  return undefined;
}

/** Liberta o lock após embalagem / etiqueta (opcional, packedAt já impede reuso). */
export async function releaseOpBoxInspectionLock(opBoxId: string): Promise<void> {
  await db.opBox.updateMany({
    where: { id: opBoxId },
    data: {
      inspectionLockedByUserId: null,
      inspectionLockedAt: null,
    },
  });
}
