"use server"

import db from "@/providers/database";

export async function getOpBoxWithBlistersById(id: number) {
  return db.opBox.findUnique({
    where: {
      id,
    },
    include: { OpBoxBlister: true },
  });
}
