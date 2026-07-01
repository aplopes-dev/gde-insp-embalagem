import db from "@/providers/database";
import { BlisterConfig } from "./resolve-piece-registration";

export async function findBlisterConfigFromProductHistory(
  productTypeId: number
): Promise<BlisterConfig | null> {
  const previousOp = await db.op.findFirst({
    where: { productTypeId },
    orderBy: { createdAt: "desc" },
  });

  if (!previousOp) {
    return null;
  }

  const blisterType = await db.blisterType.findFirst({
    where: { id: previousOp.blisterTypeId },
  });

  if (
    !blisterType ||
    blisterType.slots <= 0 ||
    blisterType.limitPerBox <= 0
  ) {
    return null;
  }

  return {
    slots: blisterType.slots,
    limitPerBox: blisterType.limitPerBox,
  };
}
