import db from "@/providers/database";
import { BlisterApontamentoSource } from "./build-jerp-blister-apontamento";

/** Blisters efetivamente embalados na caixa (fonte autoritativa para apontamento JERP). */
export async function getPackedBlistersByBox(
  boxId: string
): Promise<BlisterApontamentoSource[]> {
  const rows = await db.opBoxBlister.findMany({
    where: { opBoxId: boxId, packedAt: { not: null } },
    select: { code: true, quantity: true },
    orderBy: { packedAt: "asc" },
  });

  return rows.map((row) => ({
    code: row.code,
    quantity: row.quantity,
  }));
}
