import db from "@/providers/database";
import {
  compareOpBoxCodeAsc,
  OpBoxWithBlisters,
  sortOpBoxBlisters,
} from "@/usecases/op/find-next-pending-op-box";
import { INSPECTION_LOCK_TTL_MS } from "@/usecases/op/inspection-lock-timing";

export { INSPECTION_LOCK_TTL_MS, INSPECTION_LOCK_HEARTBEAT_MS } from "@/usecases/op/inspection-lock-timing";

/**
 * Lock só vale enquanto a tela de inspeção estiver carregada (heartbeat).
 * Sem renovação, a caixa volta a ficar livre rapidamente.
 */

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

/**
 * Postos em paralelo na mesma OP. Cada um fica com uma caixa exclusiva.
 * Quatro óculos podem estar em 64, 65, 66 e 67 ao mesmo tempo.
 * O quinto espera a menor caixa; não se salta um furo na numeração.
 */
export const MAX_PARALLEL_INSPECTIONS = 4;

/** Caixa seguinte imediata (54 → 55). */
export function isImmediateNextPending(p0Code: string, p1Code: string): boolean {
  return (Number(p1Code) || 0) === (Number(p0Code) || 0) + 1;
}

/**
 * Janela de caixas consecutivas a partir da menor pendente (no máximo 4).
 * Para na primeira falha de numeração (54 pendente e 56 sem a 55 não abre a 56).
 */
export function consecutiveClaimWindow(ordered: PendingBoxLock[]): PendingBoxLock[] {
  if (ordered.length === 0) return [];
  const window: PendingBoxLock[] = [ordered[0]];
  for (let i = 1; i < ordered.length && window.length < MAX_PARALLEL_INSPECTIONS; i++) {
    const prev = window[window.length - 1];
    if (!isImmediateNextPending(prev.code, ordered[i].code)) break;
    window.push(ordered[i]);
  }
  return window;
}

/**
 * Bloqueia fechar uma caixa se existir pendente fora da janela de 4 postos.
 * Permite fechar a 67 com a 64, 65 e 66 ainda em curso.
 * Bloqueia a 68 enquanto a 64 continuar pendente.
 */
export function pendingBoxesBlockingPack(
  thisCode: string,
  otherPendingCodes: string[]
): string[] {
  const n = Number(thisCode) || 0;
  const oldestAllowed = n - (MAX_PARALLEL_INSPECTIONS - 1);
  return otherPendingCodes.filter((code) => (Number(code) || 0) < oldestAllowed);
}

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

function isClaimableBy(
  box: PendingBoxLock,
  userId: string,
  expireBefore: Date
): boolean {
  return !isLockHeldByOther(box, userId, expireBefore);
}

function sortedPending(pending: PendingBoxLock[]): PendingBoxLock[] {
  return [...pending].sort((a, b) => compareOpBoxCodeAsc(a.code, b.code));
}

/**
 * - Sempre prefere a menor caixa pendente livre (preenche furos, ex. 54).
 * - Até 4 postos em caixas consecutivas (64, 65, 66, 67).
 * - O quinto espera a menor; não se salta um número em falta.
 */
export function resolveSequentialClaim(
  pending: PendingBoxLock[],
  userId: string,
  expireBefore: Date
): SequentialClaimDecision {
  if (pending.length === 0) return { action: "none", next: undefined };

  const ordered = sortedPending(pending);
  const window = consecutiveClaimWindow(ordered);

  const own = ordered.find(
    (box) =>
      box.inspectionLockedByUserId === userId &&
      box.inspectionLockedAt != null &&
      box.inspectionLockedAt >= expireBefore
  );

  if (own) {
    const index = window.findIndex((box) => box.id === own.id);
    if (index >= 0) {
      const earlierHeld = window
        .slice(0, index)
        .every((box) => isLockHeldByOther(box, userId, expireBefore));
      if (earlierHeld) return { action: "claim", next: own };
    }
  }

  const claimable = window.find((box) => isClaimableBy(box, userId, expireBefore));
  if (claimable) return { action: "claim", next: claimable };

  return { action: "wait", next: ordered[0] };
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

export async function assertNoSkippedPendingOpBox(
  opId: number,
  boxId: string,
  boxCode: string
): Promise<void> {
  const others = await db.opBox.findMany({
    where: { opId, packedAt: null, NOT: { id: boxId } },
    select: { code: true },
  });
  const blocking = pendingBoxesBlockingPack(
    boxCode,
    others.map((b) => b.code)
  );
  if (blocking.length === 0) return;

  const first = [...blocking].sort(compareOpBoxCodeAsc)[0];
  throw new Error(
    `A caixa ${first} ainda não foi embalada. Não avance à caixa ${boxCode}.`
  );
}

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

/** Renova o lock enquanto a tela de inspeção está carregada. */
export async function renewOpBoxInspectionLock(
  opBoxId: string,
  userId: string,
  now: Date = new Date()
): Promise<boolean> {
  const result = await db.opBox.updateMany({
    where: {
      id: opBoxId,
      packedAt: null,
      inspectionLockedByUserId: userId,
    },
    data: { inspectionLockedAt: now },
  });
  return result.count === 1;
}

/** Liberta o lock quando a inspeção deixa de estar carregada. */
export async function releaseOpBoxInspectionLock(
  opBoxId: string,
  userId?: string
): Promise<void> {
  await db.opBox.updateMany({
    where: {
      id: opBoxId,
      packedAt: null,
      ...(userId ? { inspectionLockedByUserId: userId } : {}),
    },
    data: {
      inspectionLockedByUserId: null,
      inspectionLockedAt: null,
    },
  });
}
