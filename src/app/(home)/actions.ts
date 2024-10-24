"use server";

import prisma from "@/providers/database";
import { FilterPaginationParams } from "@/types/filter";
import { getOwnFilterClauses } from "@/utils/filter";
import { OpDto } from "./_types/op-dto";
import { OpJerpDto } from "./_types/op-jerp-dto";

type OpQuantityProducedDto = {
  code: string;
  produced: number;
};

//TODO: Integrate with Nexin
export async function getOpFromNexinToProduceByCode(code: string): Promise<OpJerpDto> {
  await delay(1000);
  // New payload:
  // return {
  //   id: 327117,
  //   numero: Number(code),
  //   produto: {
  //     id: 1,
  //     nome: "XBB"
  //   },
  //   quantidadeAProduzir: 112,
  //   embalagens: [
  //     {
  //       id: 1,
  //       nome: "BLISTER_XBB",
  //       quantidadeAlocada: 20
  //     },
  //     {
  //       id: 1,
  //       nome: "CAIXA 520X320X170 TRIPLEX",
  //       quantidadeAlocada: 2
  //     },
  //     {
  //       id: 1,
  //       nome: "DIVISORIAS CX 520X320X170",
  //       quantidadeAlocada: 4
  //     }
  //   ]
  // } as OpJerpDto

  // Old payload:
  // return {
  //   id: 327117,
  //   Numero: Number(code),
  //   Produto: "BL-05432070 LD",
  //   QuantidadeAProduzir: 112,
  //   Embalagens: [
  //     "BL-05432070 LD Rev.0 Antiestático", //mais de 500 tipos - o blister sabe a sua caixa
  //     "CAIXA 520X320X170 TRIPLEX", //3 tipos
  //     "DIVISORIAS CX 520X320X170",
  //   ],
  // };

  // Requet from jerp:
  const dynamicData = await fetch(
    `https://jerpapiprod.azurewebsites.net/api/ordemproducao/${code}`,
    {
      headers: {
        authorization: `Bearer ${process.env.JERP_TOKEN}`,
      },
      cache: "no-store",
    }
  );
  const data = await dynamicData.json();
  return data as OpJerpDto;
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

  const ids = transaction[1].map((op) => op.id);
  let quantityArr: OpQuantityProducedDto[] = [];

  if (ids && ids.length > 0) {
    quantityArr =
      await prisma.$queryRawUnsafe(`select op.code, CAST(sum(bl.quantity) AS INTEGER) as produced from "OpBoxBlister" as bl
    inner join "OpBox" bx on bx."id" = bl."opBoxId"
    inner join "Op" op on op."id" = bx."opId"
    where bl."packedAt" is not null and op.id in(${ids.join(",")})
    group by op.id`);
  }

  const quantityMap = new Map(
    quantityArr.map((row) => [row.code, row.produced])
  );

  const _data: OpDto[] = transaction[1].map((op) => {
    return {
      id: op.id,
      code: op.code,
      itemsPacked: quantityMap.get(op.code) || 0,
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
