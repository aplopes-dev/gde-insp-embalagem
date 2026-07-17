import db from "@/providers/database";
import logger from "@/libs/logger";
import { getOpFromId } from "@/shared/services/jerp";
import { recalculateBoxesFromOpAndItemQuantity } from "@/usecases/op/recalculate-boxes-from-quantity";
import {
  decideAlignPendingWithJerp,
  sumInternalPendingPieces,
} from "@/usecases/op/align-pending-with-jerp";
import { getPackedQuantityForOp } from "@/usecases/op-jerp/reconcile-op-quantity-with-jerp";

export type OpReconciliationResult = {
  opId: number;
  opCode: string;
  jerpRemaining: number | null;
  internalPending: number;
  diverged: boolean;
  corrected: boolean;
  skippedInProgress?: boolean;
  error?: string;
};

async function logReconciliation(params: {
  opId: number;
  userId: string | null;
  description: string;
  details: Record<string, unknown>;
}) {
  if (!params.userId) return;
  try {
    await db.opActivityLog.create({
      data: {
        opId: params.opId,
        userId: params.userId,
        actionType: "STATUS_CHANGED",
        description: params.description,
        details: { event: "JERP_RECONCILIATION", ...params.details } as object,
      },
    });
  } catch (error) {
    logger.error({
      message: "Falha ao registrar reconciliação no log.",
      error,
    });
  }
}

/**
 * Compara o pendente interno de uma OP com o restante informado pelo JERP
 * (fonte de verdade) e, opcionalmente, corrige o interno recriando as caixas
 * pendentes. Toda divergência é registrada em OpActivityLog.
 *
 * `jerpRemaining` opcional evita uma segunda chamada ao JERP (ex.: abertura da OP).
 * Com `protectInProgress` (default true), não apaga caixa pendente com blister
 * já conferido.
 */
export async function reconcileOpWithJerp(
  opId: number,
  userId: string | null,
  options: {
    autoCorrect?: boolean;
    jerpRemaining?: number;
    protectInProgress?: boolean;
  } = {}
): Promise<OpReconciliationResult> {
  const {
    autoCorrect = true,
    protectInProgress = true,
    jerpRemaining: jerpRemainingOption,
  } = options;

  const op = await db.op.findUnique({
    where: { id: opId },
    include: { OpBox: { include: { OpBoxBlister: true } } },
  });

  if (!op) {
    return {
      opId,
      opCode: String(opId),
      jerpRemaining: null,
      internalPending: 0,
      diverged: false,
      corrected: false,
      error: "OP não encontrada",
    };
  }

  const internalPending = sumInternalPendingPieces(op.OpBox);

  let jerpRemaining: number;
  if (jerpRemainingOption != null) {
    jerpRemaining = Math.max(0, jerpRemainingOption);
  } else {
    const red = await getOpFromId(String(opId));
    if (red.isLeft()) {
      return {
        opId,
        opCode: op.code,
        jerpRemaining: null,
        internalPending,
        diverged: false,
        corrected: false,
        error: red.getLeft().error,
      };
    }
    jerpRemaining = red.get().quantidadeAProduzir ?? 0;
  }

  const decision = decideAlignPendingWithJerp({
    boxes: op.OpBox,
    jerpRemaining,
  });

  if (decision.action === "noop") {
    // Mantém quantityToProduce alinhado mesmo sem recriar caixas.
    const itemsPacked = await getPackedQuantityForOp(opId);
    const correctQuantity = itemsPacked + jerpRemaining;
    if (op.quantityToProduce !== correctQuantity) {
      await db.op.update({
        where: { id: opId },
        data: { quantityToProduce: correctQuantity },
      });
    }
    return {
      opId,
      opCode: op.code,
      jerpRemaining,
      internalPending,
      diverged: false,
      corrected: false,
    };
  }

  const diverged = true;

  logger.warn({
    message: "Reconciliação: pendente interno diverge do restante do JERP.",
    opId,
    opCode: op.code,
    internalPending: decision.internalPending,
    jerpRemaining: decision.jerpRemaining,
    decision: decision.action,
    autoCorrect,
  });

  if (decision.action === "skip_in_progress" && protectInProgress) {
    await logReconciliation({
      opId,
      userId,
      description: `Reconciliação JERP adiada: inspeção em andamento (pendente interno ${decision.internalPending} vs JERP ${decision.jerpRemaining}).`,
      details: {
        internalPending: decision.internalPending,
        jerpRemaining: decision.jerpRemaining,
        autoCorrect: false,
        skippedInProgress: true,
      },
    });

    // Atualiza só o total da OP para o painel; não mexe nas caixas a meio.
    const itemsPacked = await getPackedQuantityForOp(opId);
    const correctQuantity = itemsPacked + jerpRemaining;
    if (op.quantityToProduce !== correctQuantity) {
      await db.op.update({
        where: { id: opId },
        data: { quantityToProduce: correctQuantity },
      });
    }

    return {
      opId,
      opCode: op.code,
      jerpRemaining,
      internalPending: decision.internalPending,
      diverged,
      corrected: false,
      skippedInProgress: true,
    };
  }

  if (!autoCorrect) {
    await logReconciliation({
      opId,
      userId,
      description: `Reconciliação JERP: pendente interno ${decision.internalPending} vs JERP ${decision.jerpRemaining}.`,
      details: {
        internalPending: decision.internalPending,
        jerpRemaining: decision.jerpRemaining,
        autoCorrect: false,
      },
    });
    return {
      opId,
      opCode: op.code,
      jerpRemaining,
      internalPending: decision.internalPending,
      diverged,
      corrected: false,
    };
  }

  await recalculateBoxesFromOpAndItemQuantity(opId, Math.max(0, jerpRemaining));

  await logReconciliation({
    opId,
    userId,
    description: `Reconciliação JERP: pendente interno ${decision.internalPending} vs JERP ${decision.jerpRemaining}. Interno ajustado ao JERP.`,
    details: {
      internalPending: decision.internalPending,
      jerpRemaining: decision.jerpRemaining,
      autoCorrect: true,
    },
  });

  return {
    opId,
    opCode: op.code,
    jerpRemaining,
    internalPending: decision.internalPending,
    diverged,
    corrected: true,
  };
}

/**
 * Reconcilia todas as OPs abertas (não finalizadas) com o JERP.
 */
export async function reconcileOpenOpsWithJerp(
  userId: string | null,
  options: { autoCorrect?: boolean } = {}
): Promise<OpReconciliationResult[]> {
  const openOps = await db.op.findMany({
    where: { finishedAt: null },
    select: { id: true },
  });

  const results: OpReconciliationResult[] = [];
  for (const { id } of openOps) {
    try {
      results.push(await reconcileOpWithJerp(id, userId, options));
    } catch (error: any) {
      logger.error({
        message: "Falha ao reconciliar OP com o JERP.",
        opId: id,
        error,
      });
      results.push({
        opId: id,
        opCode: String(id),
        jerpRemaining: null,
        internalPending: 0,
        diverged: false,
        corrected: false,
        error: error?.message || "erro desconhecido",
      });
    }
  }

  return results;
}
