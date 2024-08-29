import prisma from "@/providers/database";
import { FilterPaginationParams } from "@/types/filter";
import { getOwnFilterClauses } from "@/utils/filter";
import OpBoxDto from "./_types/op-box-dto";

export async function getPaginatedBoxOp({
  limit,
  skip,
  field,
  order,
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
