import db from "@/providers/database";
import logger from "@/libs/logger";
import { getOpFromId } from "@/shared/services/jerp";
import { recalculateBoxesFromOpAndItemQuantity } from "@/app/op/[opId]/actions";

export type OpReconciliationResult = {
  opId: number;
  opCode: string;
  jerpRemaining: number | null;
  internalPending: number;
  diverged: boolean;
  corrected: boolean;
  error?: string;
};

/**
 * Compara o pendente interno de uma OP com o restante informado pelo JERP
 * (fonte de verdade) e, opcionalmente, corrige o interno recriando as caixas
 * pendentes. Toda divergência é registrada em OpActivityLog (item 8).
 */
export async function reconcileOpWithJerp(
  opId: number,
  userId: string | null,
  options: { autoCorrect?: boolean } = {}
): Promise<OpReconciliationResult> {
  const { autoCorrect = true } = options;

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

  // Pendente interno: soma planejada dos blisters das caixas ainda não embaladas.
  const internalPending = op.OpBox
    .filter((box) => box.packedAt == null)
    .reduce(
      (total, box) =>
        total + box.OpBoxBlister.reduce((sum, bl) => sum + bl.quantity, 0),
      0
    );

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

  const jerpRemaining = red.get().quantidadeAProduzir ?? 0;
  const diverged = jerpRemaining !== internalPending;

  let corrected = false;

  if (diverged) {
    logger.warn({
      message: "Reconciliação: pendente interno diverge do restante do JERP.",
      opId,
      opCode: op.code,
      internalPending,
      jerpRemaining,
      autoCorrect,
    });

    if (userId) {
      try {
        await db.opActivityLog.create({
          data: {
            opId,
            userId,
            actionType: "STATUS_CHANGED",
            description: `Reconciliação JERP: pendente interno ${internalPending} vs JERP ${jerpRemaining}.${
              autoCorrect ? " Interno ajustado ao JERP." : ""
            }`,
            details: {
              event: "JERP_RECONCILIATION",
              internalPending,
              jerpRemaining,
              autoCorrect,
            } as any,
          },
        });
      } catch (error) {
        logger.error({
          message: "Falha ao registrar reconciliação no log.",
          error,
        });
      }
    }

    if (autoCorrect) {
      await recalculateBoxesFromOpAndItemQuantity(
        opId,
        Math.max(0, jerpRemaining)
      );
      corrected = true;
    }
  }

  return {
    opId,
    opCode: op.code,
    jerpRemaining,
    internalPending,
    diverged,
    corrected,
  };
}

/**
 * Reconcilia todas as OPs abertas (não finalizadas) com o JERP.
 * Ideal para execução periódica (cron/rotina) antes que divergências
 * virem erro de produção.
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
