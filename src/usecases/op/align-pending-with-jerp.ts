/**
 * Decisão pura: quando realinhar caixas pendentes ao restante JERP na abertura da OP.
 */

export type PendingBoxForAlign = {
  packedAt: Date | null;
  OpBoxBlister: Array<{ packedAt: Date | null; quantity: number }>;
};

/** Caixa pendente com pelo menos um blister já conferido (inspeção em andamento). */
export function hasInProgressPendingBox(
  boxes: ReadonlyArray<PendingBoxForAlign>
): boolean {
  return boxes.some(
    (box) =>
      box.packedAt == null &&
      box.OpBoxBlister.some((bl) => bl.packedAt != null)
  );
}

export function sumInternalPendingPieces(
  boxes: ReadonlyArray<PendingBoxForAlign>
): number {
  return boxes
    .filter((box) => box.packedAt == null)
    .reduce(
      (total, box) =>
        total + box.OpBoxBlister.reduce((sum, bl) => sum + bl.quantity, 0),
      0
    );
}

export type AlignPendingDecision =
  | { action: "noop"; reason: "aligned" }
  | { action: "recalculate"; reason: "diverged"; internalPending: number; jerpRemaining: number }
  | {
      action: "skip_in_progress";
      reason: "diverged_but_inspection_in_progress";
      internalPending: number;
      jerpRemaining: number;
    };

/**
 * Se o pendente interno diverge do JERP, recria pendentes — exceto quando há
 * inspeção a meio (blisters já packed numa caixa ainda PENDING).
 */
export function decideAlignPendingWithJerp(params: {
  boxes: ReadonlyArray<PendingBoxForAlign>;
  jerpRemaining: number;
}): AlignPendingDecision {
  const internalPending = sumInternalPendingPieces(params.boxes);
  const jerpRemaining = Math.max(0, params.jerpRemaining);

  if (internalPending === jerpRemaining) {
    return { action: "noop", reason: "aligned" };
  }

  if (hasInProgressPendingBox(params.boxes)) {
    return {
      action: "skip_in_progress",
      reason: "diverged_but_inspection_in_progress",
      internalPending,
      jerpRemaining,
    };
  }

  return {
    action: "recalculate",
    reason: "diverged",
    internalPending,
    jerpRemaining,
  };
}
