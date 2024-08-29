"use server";

import prisma from "@/providers/database";
import { FilterPaginationParams } from "@/types/filter";
import { getOwnFilterClauses } from "@/utils/filter";
import { OpDto } from "./_types/op-dto";

type JerpOpDto = {
  id: number;
  Numero: number;
  Produto: string;
  QuantidadeAProduzir: number;
  Embalagens: string[];
};

//TODO: Integrate with Nexin
export async function getOpToProduceByCode(code: string) {
  await delay(1000);
  return {
    id: 327117,
    Numero: Number(code),
    Produto: "BL-05432070 LD",
    QuantidadeAProduzir: 112,
    Embalagens: [
      "BL-05432070 LD Rev.0 Antiestático", //mais de 500 tipos - o blister sabe a sua caixa
      "CAIXA 520X320X170 TRIPLEX", //3 tipos
      "DIVISORIAS CX 520X320X170",
    ],
  };
  // const dynamicData = await fetch(
  //   `https://jerpapiprod.azurewebsites.net/api/ordemproducao/${opCode}`,
  //   {
  //     headers: {
  //       authorization: `Bearer ${process.env.JERP_TOKEN}`,
  //     },
  //     cache: "no-store",
  //   }
  // );
  // const data = await dynamicData.json();
  // return data as JerpOpDto;
}

export async function getPaginatedOp({
  limit,
  skip,
  field,
  order,
  filters,
}: FilterPaginationParams) {
  let whereClauses = getOwnFilterClauses(filters);

  whereClauses = {
    ...whereClauses,
    finishedAt: {
      not: null,
    },
  };

  const transaction = await prisma.$transaction([
    prisma.op.count({
      where: whereClauses,
    }),
    prisma.op.findMany({
      where: whereClauses,
      orderBy: [
        {
          [`${field}`]: order.toLocaleLowerCase(),
        },
      ],
      include: {
        product: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      skip,
      take: limit,
    }),
  ]);

  const _data: OpDto[] = transaction[1].map((op) => {
    return {
      id: op.id,
      code: op.code,
      quantityToProduce: op.quantityToProduce,
      productTypeId: op.productTypeId,
      product: op.product,
      finishedAt: op.finishedAt || undefined,
      createdAt: op.createdAt,
      status: op.status,
    };
  });

  const _count = transaction[0];
  return [_data, _count];
}

const delay = (ms: number | undefined) =>
  new Promise((res) => setTimeout(res, ms));
