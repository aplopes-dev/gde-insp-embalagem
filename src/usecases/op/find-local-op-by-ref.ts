"use server";

import db from "@/providers/database";
import { Op } from "@prisma/client";

export async function findLocalOpByRef(ref: string): Promise<Op | null> {
  const trimmed = ref.trim();
  if (!trimmed) return null;

  const asInt = Number(trimmed);
  if (Number.isInteger(asInt) && asInt > 0) {
    const byId = await db.op.findFirst({ where: { id: asInt } });
    if (byId) return byId;
  }

  return db.op.findFirst({ where: { code: trimmed } });
}
