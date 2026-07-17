import db from "@/providers/database";
import { createOpBoxesData } from "@/usecases/op/create-op-data";
import { getPackedQuantityForOp } from "@/usecases/op-jerp/reconcile-op-quantity-with-jerp";

/**
 * Remove caixas pendentes e recria a partir da quantidade restante (ex.: JERP).
 * Atualiza `Op.quantityToProduce` para packed + quantityToProduce.
 */
export async function recalculateBoxesFromOpAndItemQuantity(
  opId: number,
  quantityToProduce: number
) {
  const op = await db.op.findUnique({
    where: { id: opId },
    include: { blister: true, OpBox: true },
  });

  if (!op) {
    throw new Error(`Not found OP with ID: ${opId}`);
  }

  // Sempre remove as caixas/blisters pendentes (não embalados) antes de recriar.
  await db.$transaction([
    db.opBoxBlister.deleteMany({
      where: {
        packedAt: null,
        opBox: { opId },
      },
    }),
    db.opBox.deleteMany({
      where: {
        opId,
        packedAt: null,
      },
    }),
  ]);

  // Nada pendente: não há caixas a recriar (ex.: OP já concluída no JERP).
  if (quantityToProduce <= 0) {
    return db.op.findUnique({ where: { id: opId } });
  }

  // Numeração sem duplicidade. Continua a partir do maior `code` já
  // existente (inclusive de caixas embaladas), evitando reuso após deleções.
  const maxCode = op.OpBox.reduce(
    (max, b) => Math.max(max, Number(b.code) || 0),
    0
  );

  const boxes = createOpBoxesData({
    quantityToProduce,
    blisterSlots: op.blister?.slots,
    blisterPerBox: op.blister?.limitPerBox,
    boxGap: maxCode,
  });

  const itemsPacked = await getPackedQuantityForOp(opId);

  return db.op.update({
    data: {
      quantityToProduce: itemsPacked + quantityToProduce,
      OpBox: {
        create: boxes?.map((box) => {
          const blisters = [...(box.blisters || [])];
          delete (box as { blisters?: unknown }).blisters;
          return {
            ...box,
            OpBoxBlister: {
              create: blisters,
            },
          };
        }),
      },
    },
    where: { id: opId },
  });
}
