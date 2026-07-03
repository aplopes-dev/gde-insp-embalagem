import db from "@/providers/database";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { Op } from "@prisma/client";

export async function getPackedQuantityForOp(opId: number): Promise<number> {
  const result = await db.opBoxBlister.aggregate({
    _sum: { quantity: true },
    where: {
      packedAt: { not: null },
      opBox: { opId },
    },
  });
  return result._sum.quantity ?? 0;
}

export async function reconcileOpQuantityWithJerp(
  internalOp: Op,
  externalOp: OpJerpDto
): Promise<Op> {
  const itemsPacked = await getPackedQuantityForOp(internalOp.id);
  const correctQuantity = itemsPacked + externalOp.quantidadeAProduzir;

  if (internalOp.quantityToProduce === correctQuantity) {
    return internalOp;
  }

  return db.op.update({
    where: { id: internalOp.id },
    data: { quantityToProduce: correctQuantity },
  });
}

export function resolvePendingQuantity(
  itemsPacked: number,
  storedQuantityToProduce: number,
  jerpRemaining?: number
): number {
  if (jerpRemaining != null && jerpRemaining >= 0) {
    return jerpRemaining;
  }
  return Math.max(storedQuantityToProduce - itemsPacked, 0);
}
