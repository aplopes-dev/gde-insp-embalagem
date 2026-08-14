import db from "@/providers/database";
import {
  compareOpBoxCodeAsc,
  OpBoxWithBlisters,
  sortOpBoxBlisters,
} from "@/usecases/op/find-next-pending-op-box";

/** Tempo máximo de lock de inspeção sem renovação (minutos). */
export const INSPECTION_LOCK_TTL_MS = 30 * 60 * 1000;

export type PendingBoxLock = {
  id: string;
  code: string;
  inspectionLockedByUserId: string | null;
  inspectionLockedAt: Date | null;
};

export type SequentialClaimDecision =
  | { action: "none"; next: undefined }
  | { action: "wait"; next: PendingBoxLock }
  | { action: "claim"; next: PendingBoxLock };

function isLockHeldByOther(
  box: PendingBoxLock,
  userId: string,
  expireBefore: Date
): boolean {
  if (!box.inspectionLockedByUserId) return false;
  if (box.inspectionLockedByUserId === userId) return false;
  if (!box.inspectionLockedAt) return false;
  return box.inspectionLockedAt >= expireBefore;
}

/**
 * Próxima caixa é sempre a de menor `code` ainda pendente.
 * Se outro posto a estiver a embalar, espera — nunca salta para a seguinte
 * (causa do furo da caixa 54 na OP 81528).
 */
export function resolveSequentialClaim(
  pending: PendingBoxLock[],
  userId: string,
  expireBefore: Date
): SequentialClaimDecision {
  if (pending.length === 0) return { action: "none", next: undefined };

  const next = [...pending].sort((a, b) =>
    compareOpBoxCodeAsc(a.code, b.code)
  )[0];

  if (isLockHeldByOther(next, userId, expireBefore)) {
    return { action: "wait", next };
  }

  return { action: "claim", next };
}

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
 * - Só a menor caixa pendente (ordem numérica) pode ser reservada.
 * - Renova lock se essa caixa já estiver com o mesmo user.
 * - Ignora locks expirados.
 * - Se a próxima estiver com outro operador, não entrega a seguinte.
 */
export async function claimNextPendingOpBox(
  opId: number,
  userId: string,
  now: Date = new Date()
): Promise<OpBoxWithBlisters | undefined> {
  const expireBefore = new Date(now.getTime() - INSPECTION_LOCK_TTL_MS);

  const pending = await db.opBox.findMany({
    where: { opId, packedAt: null },
    select: {
      id: true,
      code: true,
      inspectionLockedByUserId: true,
      inspectionLockedAt: true,
    },
  });

  const decision = resolveSequentialClaim(pending, userId, expireBefore);

  // Liberta locks deste user em caixas que não são a próxima da sequência
  // (evita um salto antigo bloquear a ordem depois).
  await db.opBox.updateMany({
    where: {
      opId,
      packedAt: null,
      inspectionLockedByUserId: userId,
      ...(decision.next ? { NOT: { id: decision.next.id } } : {}),
    },
    data: {
      inspectionLockedByUserId: null,
      inspectionLockedAt: null,
    },
  });

  if (decision.action !== "claim" || !decision.next) {
    return undefined;
  }

  const claimed = await db.opBox.updateMany({
    where: {
      id: decision.next.id,
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

  if (claimed.count !== 1) return undefined;
  return loadBoxWithBlisters(decision.next.id);
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
