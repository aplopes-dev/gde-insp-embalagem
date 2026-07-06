import db from "@/providers/database";
import { OpBox, OpBoxBlister } from "@prisma/client";

export type OpBoxWithBlisters = OpBox & { OpBoxBlister: OpBoxBlister[] };

/** Ordena códigos de caixa numericamente ("2" < "10" < "23"). */
export function compareOpBoxCodeAsc(a: string, b: string): number {
  return (Number(a) || 0) - (Number(b) || 0);
}

/**
 * Próxima caixa pendente da OP, em ordem numérica de `code` (1, 2, 3…).
 * Garante que a última caixa parcial só seja embalada após as cheias.
 */
export async function findNextPendingOpBox(
  opId: number
): Promise<OpBoxWithBlisters | undefined> {
  const pending = await db.opBox.findMany({
    where: { opId, packedAt: null },
    include: { OpBoxBlister: true },
  });

  if (pending.length === 0) return undefined;

  return [...pending].sort((a, b) => compareOpBoxCodeAsc(a.code, b.code))[0];
}

export function sumPlannedBoxQuantity(
  blisters: ReadonlyArray<{ quantity: number }>
): number {
  return blisters.reduce((total, blister) => total + blister.quantity, 0);
}
