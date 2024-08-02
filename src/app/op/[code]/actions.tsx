"use server";

import { getOpToProduceByCode } from "@/app/(home)/actions";
import prisma from "@/providers/database";

export async function syncAndGetOpToProduceByCode(code: string) {
  const externalOp = await getOpToProduceByCode(code);
  let internalOp = await prisma.op.findFirst({
    where: {
      code: `${externalOp.Numero}`,
    },
  });

  if (!internalOp) {
    const refNames = ["Produto", "Blister", "Caixa"];
    const refValue = [
      `${externalOp.Produto}`,
      `${externalOp.Embalagens[0]}`,
      `${externalOp.Embalagens[1]}`,
    ];
    const transaction = await prisma.$transaction([
      prisma.productType.findFirst({
        where: {
          name: refValue[0],
        },
        select: {
          id: true,
        },
      }),
      prisma.blisterType.findFirst({
        where: {
          name: refValue[1],
        },
        select: {
          id: true,
        },
      }),
      prisma.boxType.findFirst({
        where: {
          name: refValue[2],
        },
        select: {
          id: true,
        },
      }),
    ]);

    const indexNullReference = transaction.findIndex((rf) => !rf?.id);
    if (indexNullReference >= 0) {
      throw new Error(
        `Referência de ${refNames[indexNullReference]} não encontrada.`
      );
    }

    internalOp = await prisma.op.create({
      data: {
        code: `${externalOp.Numero}`,
        productTypeId: Number(transaction[0]?.id),
        blisterTypeId: Number(transaction[1]?.id),
        boxTypeId: Number(transaction[2]?.id),
      },
    });
  }

  return internalOp;
}
