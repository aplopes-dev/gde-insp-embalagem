import db from "@/providers/database";
import logger from "@/libs/logger";
import { getOpFromId } from "@/shared/services/jerp";
import { recalculateBoxesFromOpAndItemQuantity } from "@/usecases/op/recalculate-boxes-from-quantity";
import {
  assertEstornoReflectedInJerp,
  sumBoxPieces,
} from "@/usecases/op-jerp/assert-box-capacity-vs-jerp";
import { AdminBoxError } from "@/usecases/op/admin-box-errors";

export type DeleteOpBoxResult = {
  deletedBoxId: string;
  deletedCode: string;
  opId: number;
  pieces: number;
  hadBarCode: boolean;
  barCode: string | null;
  jerpRemaining: number;
  estornoConfirmado: boolean;
};

/**
 * Exclui uma OpBox (cascade blisters) e recria as caixas pendentes
 * a partir do restante informado pelo JERP.
 */
export async function deleteOpBoxAndReconcile(params: {
  boxId: string;
  userId: string;
  confirmJerpReversal?: boolean;
}): Promise<DeleteOpBoxResult> {
  const box = await db.opBox.findUnique({
    where: { id: params.boxId },
    include: {
      OpBoxBlister: true,
      op: {
        include: {
          OpBox: { include: { OpBoxBlister: true } },
        },
      },
    },
  });

  if (!box) {
    throw new AdminBoxError("Caixa não encontrada", 404, "BOX_NOT_FOUND");
  }

  const pieces = sumBoxPieces(box);
  const hadBarCode = Boolean(box.barCode);

  if (hadBarCode && !params.confirmJerpReversal) {
    throw new AdminBoxError(
      "Caixa apontada no JERP: confirme que o estorno já foi efetuado (confirmJerpReversal).",
      400,
      "ESTORNO_CONFIRMATION_REQUIRED",
      {
        boxId: box.id,
        code: box.code,
        barCode: box.barCode,
        pieces,
      }
    );
  }

  const jerpResult = await getOpFromId(String(box.opId));
  if (jerpResult.isLeft()) {
    throw new AdminBoxError(
      `Falha ao consultar JERP: ${jerpResult.getLeft().error}`,
      502,
      "JERP_UNAVAILABLE"
    );
  }

  const jerpRemaining = jerpResult.get().quantidadeAProduzir ?? 0;

  if (hadBarCode) {
    const gate = assertEstornoReflectedInJerp({
      boxes: box.op.OpBox,
      targetBoxId: box.id,
      jerpRemaining,
    });
    if (!gate.ok) {
      throw new AdminBoxError(gate.message, 409, gate.code, {
        piecesInBox: gate.piecesInBox,
        pendingOther: gate.pendingOther,
        requiredRemaining: gate.requiredRemaining,
        jerpRemaining: gate.jerpRemaining,
      });
    }
  }

  const snapshot = {
    boxId: box.id,
    code: box.code,
    barCode: box.barCode,
    pieces,
    status: box.status,
    packedAt: box.packedAt,
    jerpRemaining,
    estornoConfirmado: hadBarCode && Boolean(params.confirmJerpReversal),
  };

  await db.opBox.delete({ where: { id: box.id } });

  try {
    await recalculateBoxesFromOpAndItemQuantity(
      box.opId,
      Math.max(0, jerpRemaining)
    );
  } catch (error) {
    logger.error({
      message: "Caixa excluída mas falha ao recriar pendentes a partir do JERP",
      boxId: box.id,
      opId: box.opId,
      error,
    });
    throw new AdminBoxError(
      "Caixa excluída, mas falhou a recriação das caixas pendentes. Execute a reconciliação JERP.",
      500,
      "RECALCULATE_FAILED",
      { deletedBoxId: box.id, opId: box.opId }
    );
  }

  try {
    await db.opActivityLog.create({
      data: {
        opId: box.opId,
        userId: params.userId,
        actionType: "STATUS_CHANGED",
        description: `Caixa ${box.code} excluída${
          hadBarCode ? " (após estorno JERP)" : ""
        }. Pendentes recriadas a partir do JERP (${jerpRemaining} peças).`,
        details: { event: "BOX_DELETED", ...snapshot } as any,
        boxId: box.id,
      },
    });
  } catch (error) {
    logger.error({
      message: "Falha ao registrar BOX_DELETED no activity log",
      error,
    });
  }

  return {
    deletedBoxId: box.id,
    deletedCode: box.code,
    opId: box.opId,
    pieces,
    hadBarCode,
    barCode: box.barCode,
    jerpRemaining,
    estornoConfirmado: snapshot.estornoConfirmado,
  };
}
