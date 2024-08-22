"use server";

import { getOpToProduceByCode } from "@/app/(home)/actions";
import prisma from "@/providers/database";
import {
  OpBoxBlisterInspection,
  OpBoxInspectionDto,
  OpInspectionDto,
} from "../types/op-box-inspection-dto";

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
          limitPerBox: true,
          slots: true,
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
        quantityToProduce: externalOp.QuantidadeAProduzir,
        OpBox: {
          create: getCollectionToCreateBlisterBoxes(
            `OP${code}-BX`,
            externalOp.QuantidadeAProduzir,
            transaction[1]!.slots,
            transaction[1]!.limitPerBox
          ),
        },
      },
    });
  }

  // const blisterType = await prisma.blisterType.findFirst({
  //   where: {
  //     id: internalOp.blisterTypeId,
  //   },
  // });

  const transaction = await prisma.$transaction([
    prisma.opBox.count({
      where: {
        opId: internalOp.id,
      },
    }),
    prisma.opBox.count({
      where: {
        opId: internalOp.id,
        packedAt: null,
      },
    }),
    prisma.opBox.findFirst({
      where: {
        opId: internalOp.id,
        packedAt: null,
      },
      orderBy: {
        id: "asc",
      },
      include: {
        OpBoxBlister: true,
      },
    }),
    prisma.blisterType.findFirst({
      where: {
        id: internalOp.blisterTypeId,
      },
    }),
    prisma.boxType.findFirst({
      where: {
        id: internalOp.boxTypeId,
      },
    }),
    prisma.productType.findFirst({
      where: {
        id: internalOp.productTypeId,
      },
    }),
  ]);

  const {
    id: opId,
    code: opCode,
    status,
    quantityToProduce,
    createdAt,
    finishedAt,
  } = internalOp;

  return {
    opId,
    opCode,
    status,
    createdAt,
    finishedAt,
    quantityToProduce,
    productType: transaction[5],
    blisterType: transaction[3],
    boxType: transaction[4],
    totalBoxes: transaction[0],
    pendingBoxes: transaction[1],
    nextBox: transaction[2] || undefined,
  } as OpInspectionDto;
}

export async function persistBoxStatusWithBlisters(
  boxDto: OpBoxInspectionDto,
  blisters: OpBoxBlisterInspection[],
  opId: number,
  finalizeOp: boolean
) {
  const { id, status } = boxDto;

  const queryCollection: any[] = blisters.map((bl) =>
    prisma.opBoxBlister.update({
      data: {
        packedAt: bl.packedAt?.toISOString(),
      },
      where: {
        id: bl.id,
        opBoxId: id,
      },
    })
  );

  queryCollection.push(
    prisma.opBox.update({
      data: {
        packedAt: new Date(),
        status: status,
      },
      where: {
        id,
      },
    })
  );

  if (finalizeOp)
    queryCollection.push(
      prisma.op.update({
        data: {
          finishedAt: new Date(),
          status: 1,
        },
        where: {
          id: opId,
        },
      })
    );

  await prisma.$transaction(queryCollection);
}

export async function getNextBoxByOpId(id: number) {
  const box = await prisma.opBox.findFirst({
    where: {
      opId: id,
      packedAt: null,
    },
    orderBy: {
      id: "asc",
    },
    include: {
      OpBoxBlister: true,
    },
  });
  return box as OpBoxInspectionDto;
}

// ## ------- INTERNAL FUNCTIONS --------

function getCollectionToCreateBlisterBoxes(
  boxTagPrefix: string,
  quantityToProduce: number,
  itemPerBlister: number,
  blisterPerBox: number
) {
  const modItemPerBlister = quantityToProduce % itemPerBlister;
  let blistersToProduce =
    (quantityToProduce - modItemPerBlister) / itemPerBlister;
  let lastBlisterQuantity = itemPerBlister;
  if (modItemPerBlister > 0) {
    blistersToProduce++;
    lastBlisterQuantity = modItemPerBlister;
  }

  const modBlisterPerBox = blistersToProduce % blisterPerBox;
  let boxesToProduce = (blistersToProduce - modBlisterPerBox) / blisterPerBox;
  let lastBoxQuantity = blisterPerBox;
  if (modBlisterPerBox > 0) {
    boxesToProduce++;
    lastBoxQuantity = modBlisterPerBox;
  }

  const boxes = Array.from(Array(boxesToProduce)).map((_, i) => {
    const isLastBox = i + 1 == boxesToProduce;
    const blisterCount = isLastBox ? lastBoxQuantity : blisterPerBox;
    return {
      code: `${boxTagPrefix}-${i + 1}`,
      OpBoxBlister: {
        create: Array.from(Array(blisterCount)).map((_, j) => {
          const isLastBlister = j + 1 == blisterCount;
          const quantity =
            isLastBox && isLastBlister ? lastBlisterQuantity : itemPerBlister;
          return {
            quantity,
          };
        }),
      },
    };
  });
  return boxes;
}
