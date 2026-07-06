import db from "@/providers/database";
import { getPackedBlistersByBox } from "./get-packed-blisters-by-box";

export type AuthoritativeBoxPackedSummary = {
  boxId: string;
  quantity: number;
  blisterCount: number;
  blisters: Awaited<ReturnType<typeof getPackedBlistersByBox>>;
};

/** Quantidade e blisters embalados na caixa — única fonte para etiqueta. */
export async function getAuthoritativeBoxPackedSummary(
  boxId: string
): Promise<AuthoritativeBoxPackedSummary | null> {
  const box = await db.opBox.findUnique({
    where: { id: boxId },
    select: { id: true },
  });

  if (!box) return null;

  const blisters = await getPackedBlistersByBox(boxId);
  const quantity = blisters.reduce((sum, blister) => sum + blister.quantity, 0);

  return {
    boxId,
    quantity,
    blisterCount: blisters.length,
    blisters,
  };
}
