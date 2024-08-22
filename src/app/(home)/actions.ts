"use server";

import prisma from "@/providers/database";
import { FilterPaginationParams } from "@/types/filter";
import { getOwnFilterClauses } from "@/utils/filter";
import OpBoxDto from "./types/op-box-dto";

//TODO: Integrate with Nexin
export async function getOpToProduceByCode(opCode: string) {
  await delay(1000);
  return {
    id: 327117,
    Numero: Number(opCode),
    Produto: "BL-05432070 LD",
    QuantidadeAProduzir: 104,
    Embalagens: [
      "BL-05432070 LD Rev.0 Antiestático", //mais de 500 tipos - o blister sabe a sua caixa
      "CAIXA 520X320X170 TRIPLEX", //3 tipos
      "DIVISORIAS CX 520X320X170",
    ],
  };
  // return {
  //   id: 327117,
  //   Numero: Number(opCode),
  //   Produto: "BL-03832070 LD - NEW",
  //   QuantidadeAProduzir: 1124,
  //   Embalagens: [
  //     "Blister BL-03832070LD Rev.0 Antiestático", //mais de 500 tipos - o blister sabe a sua caixa
  //     "CAIXA 520X320X170 TRIPLEX", //3 tipos
  //     "DIVISORIAS CX 520X320X170",
  //   ],
  // };
}

export async function getPaginatedBoxOp({
  limit,
  skip,
  field = "createdAt",
  order = "desc",
  filters,
}: FilterPaginationParams) {
  let whereClauses = getOwnFilterClauses(filters);
  const transaction = await prisma.$transaction([
    prisma.opBox.count({
      where: whereClauses,
    }),
    prisma.opBox.findMany({
      where: whereClauses,
      orderBy: [
        {
          [`${field}`]: order.toLocaleLowerCase(),
        },
      ],
      skip,
      take: limit,
      include: {
        op: {
          select: {
            code: true,
            product: true,
            box: true,
            blister: true,
          },
        },
        OpBoxBlister: {
          select: {
            quantity: true,
          },
        },
      },
    }),
  ]);

  const _data: OpBoxDto[] = transaction[1].map((item) => {
    return {
      id: item.id,
      code: item.code,
      boxName: item.op.box.name,
      productName: item.op.product.name,
      opCode: item.op.code,
      packedAt: item.packedAt || undefined,
      createdAt: item.createdAt,
      status: item.status,
      quantity: item.OpBoxBlister.reduce((acc, i) => acc + i.quantity, 0),
    };
  });
  const _count = transaction[0];
  return [_data, _count];
}

const delay = (ms: number | undefined) =>
  new Promise((res) => setTimeout(res, ms));
