import db from "@/providers/database";
import logger from "@/libs/logger";
import { getOpFromId } from "@/shared/services/jerp";
import { createOpBoxesData } from "@/usecases/op/create-op-data";
import {
  assertCreateCapacityVsJerp,
  sumBoxPieces,
} from "@/usecases/op-jerp/assert-box-capacity-vs-jerp";
import { AdminBoxError } from "@/usecases/op/admin-box-errors";

export type CreateOpBoxResult = {
  id: string;
  opId: number;
  code: string;
  status: string;
  pieces: number;
  blisterCount: number;
  jerpRemaining: number;
  createdCount: number;
  codes: string[];
};

/**
 * Cria uma caixa PENDING com blisters planeados, validada contra o restante JERP.
 * Se `pieces` omitido, usa uma caixa cheia (slots * limitPerBox), limitada ao disponível.
 */
export async function createOpBoxFromJerp(params: {
  opId: number;
  userId: string;
  pieces?: number;
}): Promise<CreateOpBoxResult> {
  const op = await db.op.findUnique({
    where: { id: params.opId },
    include: {
      blister: true,
      OpBox: { include: { OpBoxBlister: true } },
    },
  });

  if (!op) {
    throw new AdminBoxError("OP não encontrada", 404, "OP_NOT_FOUND");
  }

  if (!op.blister?.slots || !op.blister?.limitPerBox) {
    throw new AdminBoxError(
      "OP sem configuração de blister (slots / limite por caixa)",
      400,
      "BLISTER_CONFIG_MISSING"
    );
  }

  const jerpResult = await getOpFromId(String(params.opId));
  if (jerpResult.isLeft()) {
    throw new AdminBoxError(
      `Falha ao consultar JERP: ${jerpResult.getLeft().error}`,
      502,
      "JERP_UNAVAILABLE"
    );
  }

  const jerpRemaining = jerpResult.get().quantidadeAProduzir ?? 0;
  const fullBoxPieces = op.blister.slots * op.blister.limitPerBox;

  const capacityProbe = assertCreateCapacityVsJerp({
    boxes: op.OpBox,
    jerpRemaining,
    requestedPieces: 1,
  });
  if (!capacityProbe.ok && capacityProbe.available <= 0) {
    throw new AdminBoxError(capacityProbe.message, 409, capacityProbe.code, {
      available: capacityProbe.available,
      jerpRemaining: capacityProbe.jerpRemaining,
      internalPending: capacityProbe.internalPending,
    });
  }

  const available = Math.max(0, jerpRemaining - capacityProbe.internalPending);
  const requestedRaw =
    params.pieces != null && params.pieces > 0
      ? params.pieces
      : Math.min(fullBoxPieces, available);
  const requested = Math.min(requestedRaw, available);

  const capacity = assertCreateCapacityVsJerp({
    boxes: op.OpBox,
    jerpRemaining,
    requestedPieces: requested,
  });
  if (!capacity.ok) {
    throw new AdminBoxError(capacity.message, 409, capacity.code, {
      available: capacity.available,
      jerpRemaining: capacity.jerpRemaining,
      internalPending: capacity.internalPending,
      requested: capacity.requested,
    });
  }

  const maxCode = op.OpBox.reduce(
    (max, b) => Math.max(max, Number(b.code) || 0),
    0
  );

  const planned = createOpBoxesData({
    quantityToProduce: requested,
    blisterSlots: op.blister.slots,
    blisterPerBox: op.blister.limitPerBox,
    boxGap: maxCode,
  });

  if (planned.length === 0) {
    throw new AdminBoxError(
      "Não foi possível planejar a caixa",
      500,
      "PLANNING_FAILED"
    );
  }

  const createdBoxes = await db.$transaction(
    planned.map((boxPlan) =>
      db.opBox.create({
        data: {
          opId: params.opId,
          code: boxPlan.code,
          status: "PENDING",
          OpBoxBlister: {
            create: (boxPlan.blisters || []).map((bl) => ({
              code: bl.code,
              quantity: bl.quantity,
            })),
          },
        },
        include: { OpBoxBlister: true },
      })
    )
  );

  const primary = createdBoxes[0];
  const totalPieces = createdBoxes.reduce(
    (sum, box) => sum + sumBoxPieces(box),
    0
  );
  const totalBlisters = createdBoxes.reduce(
    (sum, box) => sum + box.OpBoxBlister.length,
    0
  );

  try {
    await db.opActivityLog.create({
      data: {
        opId: params.opId,
        userId: params.userId,
        actionType: "STATUS_CHANGED",
        description:
          createdBoxes.length === 1
            ? `Caixa ${primary.code} criada manualmente (${totalPieces} peças, ${totalBlisters} blisters).`
            : `${createdBoxes.length} caixas criadas manualmente (${totalPieces} peças). Códigos: ${createdBoxes
                .map((b) => b.code)
                .join(", ")}.`,
        details: {
          event: "BOX_CREATED",
          boxIds: createdBoxes.map((b) => b.id),
          codes: createdBoxes.map((b) => b.code),
          pieces: totalPieces,
          blisterCount: totalBlisters,
          jerpRemaining,
          requestedPieces: requested,
        } as any,
        boxId: primary.id,
      },
    });
  } catch (error) {
    logger.error({
      message: "Falha ao registrar BOX_CREATED no activity log",
      error,
    });
  }

  return {
    id: primary.id,
    opId: primary.opId,
    code: primary.code,
    status: primary.status,
    pieces: totalPieces,
    blisterCount: totalBlisters,
    jerpRemaining,
    createdCount: createdBoxes.length,
    codes: createdBoxes.map((b) => b.code),
  };
}
