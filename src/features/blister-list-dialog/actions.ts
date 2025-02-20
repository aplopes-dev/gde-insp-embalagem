"use server"

import prisma from "@/providers/database";

export async function getOpBoxWithBlistersById(id: number) {
  return prisma.opBox.findUnique({
    where: {
      id,
    },
    include: { OpBoxBlister: true },
  });
}
