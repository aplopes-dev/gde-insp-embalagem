"use server"

import db from "@/providers/database";
import { sortOpBoxBlisters } from "@/usecases/op/find-next-pending-op-box";

export async function getOpBoxWithBlistersById(id: string) {
  const box = await db.opBox.findUnique({
    where: {
      id,
    },
    include: {
      OpBoxBlister: { orderBy: { id: "asc" } },
      op: {
        select: {
          code: true,
          product: {
            select: {
              code: true,
              description: true
            }
          }
        }
      }
    },
  });

  if (!box) return box;

  return {
    ...box,
    OpBoxBlister: sortOpBoxBlisters(box.OpBoxBlister),
  };
}
