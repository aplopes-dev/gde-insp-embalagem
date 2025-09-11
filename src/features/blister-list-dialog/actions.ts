"use server"

import db from "@/providers/database";

export async function getOpBoxWithBlistersById(id: string) {
  return db.opBox.findUnique({
    where: {
      id,
    },
    include: {
      OpBoxBlister: true,
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
}
