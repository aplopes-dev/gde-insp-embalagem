"use server";

import db from "@/providers/database";
import { generateBarcode } from "@/shared/services/jerp";
import { getOwnFilterClauses } from "@/shared/utils/filter";
import OpBoxDto from "@/types/dtos/op-box-dto";
import { PrintTagJerpDto } from "@/types/dtos/print-tag-jerp-dto";
import { FilterPaginationParams } from "@/types/filter";
import { OpBoxStatus } from "@prisma/client";

export async function getPaginatedBoxOp({
  limit,
  skip,
  field,
  order,
  filters,
}: FilterPaginationParams) {
  let whereClauses = getOwnFilterClauses(filters);
  const transaction = await db.$transaction([
    db.opBox.count({
      where: whereClauses,
    }),
    db.opBox.findMany({
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
    console.log("item");
    console.log(item);

    return {
      id: item.id,
      code: item.code,
      boxName: item.op.box.name,
      productName: item.op.product.name,
      opCode: item.op.code,
      packedAt: item.packedAt || undefined,
      barCode: item.barCode || undefined,
      barCodeGeneratedAt: item.barCodeGeneratedAt || undefined,
      createdAt: item.createdAt,
      status: item.status,
      quantity: item.OpBoxBlister.reduce((acc, i) => acc + i.quantity, 0),
    };
  });
  const _count = transaction[0];
  return [_data, _count];
}


export async function generateBarcodeByBoxId(opId: number, boxId: number): Promise<PrintTagJerpDto | null> {
  const box = await db.opBox.findUnique({
    where: {
      id: boxId,
      opId: opId,
      status: {
        not: OpBoxStatus.PENDING,
      },
    },
    include: {
      op: {
        select: {
          id: true,
          code: true,
        },
      },
      OpBoxBlister: {
        select: {
          quantity: true,
        },
        where: {
          quantity: {
            gt: 0,
          },
        },
      },
    },
  });
  if (!box) return null;

  const quantity = box.OpBoxBlister.reduce((acc, i) => acc + i.quantity, 0);
  const tagDataReq = await generateBarcode(opId, boxId, quantity);

  if (tagDataReq.isRight()) {
    return tagDataReq.get()
  } else {
    const data = tagDataReq.getLeft()
    return null
  }
}