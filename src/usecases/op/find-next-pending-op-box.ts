import db from "@/providers/database";
import { OpBox, OpBoxBlister } from "@prisma/client";
import { compareOpBoxCodeAsc, sortOpBoxBlisters } from "./op-box-blister-order";

export type OpBoxWithBlisters = OpBox & { OpBoxBlister: OpBoxBlister[] };

export {
  compareOpBlisterOrderAsc,
  compareOpBoxCodeAsc,
  parseGenBlisterIndex,
  sortOpBoxBlisters,
  sumPlannedBoxQuantity,
} from "./op-box-blister-order";

/**
 * Próxima caixa pendente da OP, em ordem numérica de `code` (1, 2, 3…).
 * Garante que a última caixa parcial só seja embalada após as cheias.
 */
export async function findNextPendingOpBox(
  opId: number
): Promise<OpBoxWithBlisters | undefined> {
  const pending = await db.opBox.findMany({
    where: { opId, packedAt: null },
    include: {
      // id asc ≈ ordem de criação; reforçado com sortOpBoxBlisters (GEN_N).
      OpBoxBlister: { orderBy: { id: "asc" } },
    },
  });

  if (pending.length === 0) return undefined;

  const next = [...pending].sort((a, b) => compareOpBoxCodeAsc(a.code, b.code))[0];
  return {
    ...next,
    OpBoxBlister: sortOpBoxBlisters(next.OpBoxBlister),
  };
}
