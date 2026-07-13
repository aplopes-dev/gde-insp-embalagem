export type BoxWithBlisters = {
  id: string;
  packedAt: Date | null;
  barCode: string | null;
  OpBoxBlister: Array<{ quantity: number }>;
};

export function sumBoxPieces(box: {
  OpBoxBlister: Array<{ quantity: number }>;
}): number {
  return box.OpBoxBlister.reduce((sum, bl) => sum + bl.quantity, 0);
}

/** Soma das peças planejadas em caixas ainda não embaladas. */
export function computeInternalPending(
  boxes: BoxWithBlisters[],
  excludeBoxId?: string
): number {
  return boxes
    .filter((box) => box.packedAt == null && box.id !== excludeBoxId)
    .reduce((total, box) => total + sumBoxPieces(box), 0);
}

export type EstornoGateResult =
  | { ok: true; piecesInBox: number; pendingOther: number; requiredRemaining: number }
  | {
      ok: false;
      code: "ESTORNO_NOT_REFLECTED";
      piecesInBox: number;
      pendingOther: number;
      requiredRemaining: number;
      jerpRemaining: number;
      message: string;
    };

/**
 * Para caixas apontadas (com barCode): o restante JERP deve já incluir
 * as peças desta caixa (estorno refletido) somadas ao pendente das demais.
 */
export function assertEstornoReflectedInJerp(params: {
  boxes: BoxWithBlisters[];
  targetBoxId: string;
  jerpRemaining: number;
}): EstornoGateResult {
  const target = params.boxes.find((b) => b.id === params.targetBoxId);
  if (!target) {
    return {
      ok: false,
      code: "ESTORNO_NOT_REFLECTED",
      piecesInBox: 0,
      pendingOther: 0,
      requiredRemaining: 0,
      jerpRemaining: params.jerpRemaining,
      message: "Caixa não encontrada na OP",
    };
  }

  const piecesInBox = sumBoxPieces(target);
  const pendingOther = computeInternalPending(params.boxes, params.targetBoxId);
  const requiredRemaining = pendingOther + piecesInBox;

  if (params.jerpRemaining < requiredRemaining) {
    return {
      ok: false,
      code: "ESTORNO_NOT_REFLECTED",
      piecesInBox,
      pendingOther,
      requiredRemaining,
      jerpRemaining: params.jerpRemaining,
      message:
        `Estorno ainda não refletido no JERP. Restante atual: ${params.jerpRemaining}; ` +
        `necessário: ${requiredRemaining} (pendente outras: ${pendingOther} + peças da caixa: ${piecesInBox}). ` +
        `Efetue o estorno no JERP e tente novamente.`,
    };
  }

  return { ok: true, piecesInBox, pendingOther, requiredRemaining };
}

export type CreateCapacityResult =
  | { ok: true; available: number; jerpRemaining: number; internalPending: number }
  | {
      ok: false;
      code: "INSUFFICIENT_CAPACITY";
      available: number;
      jerpRemaining: number;
      internalPending: number;
      requested: number;
      message: string;
    };

/** Valida se há capacidade no restante JERP para criar peças pendentes adicionais. */
export function assertCreateCapacityVsJerp(params: {
  boxes: BoxWithBlisters[];
  jerpRemaining: number;
  requestedPieces: number;
}): CreateCapacityResult {
  const internalPending = computeInternalPending(params.boxes);
  const available = Math.max(0, params.jerpRemaining - internalPending);

  if (params.requestedPieces <= 0) {
    return {
      ok: false,
      code: "INSUFFICIENT_CAPACITY",
      available,
      jerpRemaining: params.jerpRemaining,
      internalPending,
      requested: params.requestedPieces,
      message: "Quantidade de peças deve ser maior que zero",
    };
  }

  if (params.requestedPieces > available) {
    return {
      ok: false,
      code: "INSUFFICIENT_CAPACITY",
      available,
      jerpRemaining: params.jerpRemaining,
      internalPending,
      requested: params.requestedPieces,
      message:
        `Capacidade insuficiente vs JERP. Disponível: ${available} ` +
        `(restante JERP ${params.jerpRemaining} − pendente interno ${internalPending}); ` +
        `solicitado: ${params.requestedPieces}.`,
    };
  }

  return {
    ok: true,
    available,
    jerpRemaining: params.jerpRemaining,
    internalPending,
  };
}
