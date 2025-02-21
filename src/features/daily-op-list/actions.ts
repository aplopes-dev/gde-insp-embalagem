"use server";

import db from "@/providers/database";
import { FilterPaginationParams } from "@/types/filter";
import { OpDto } from "../../types/op-dto";
import { getOwnFilterClauses } from "@/shared/utils/filter";

type OpQuantityProducedDto = {
  code: string;
  produced: number;
};

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
  };

  const transaction = await db.$transaction([
    db.op.count({
      where: whereClauses,
    }),
    db.op.findMany({
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
      await db.$queryRawUnsafe(`select op.code, CAST(sum(bl.quantity) AS INTEGER) as produced from "OpBoxBlister" as bl
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
