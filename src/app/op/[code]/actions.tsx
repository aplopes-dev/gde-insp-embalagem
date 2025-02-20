"use server";

import prisma from "@/providers/database";
import { getOpFromCode } from "@/shared/services/jerp";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { OpDto } from "@/types/op-dto";
import { BlisterType, BoxType, Op, ProductType } from "@prisma/client";
import {
  OpBoxBlisterInspection,
  OpBoxInspectionDto,
  OpInspectionDto,
} from "../../../types/op-box-inspection-dto";

const bcrypt = require("bcrypt");

export async function syncAndGetOpToProduceByCode(code: string) {
  try {
    // Busca OP externa
    const externalOp = await getOpFromCode(code);
    if (!externalOp) {
      throw new Error(`OP ${code} não encontrada na API externa.`);
    }

    let internalOp = await prisma.op.findFirst({
      where: { code: `${externalOp.numero}` },
    });

    // Se não existir internamente, cria a OP
    if (!internalOp) {
      internalOp = await createInternalOp(externalOp, code);
    }

    // Busca dados relacionados à OP
    return await fetchOpDetails(internalOp);
  } catch (error) {
    console.error("Erro ao sincronizar OP:", error);
    throw new Error("Erro ao sincronizar OP. Tente novamente mais tarde.");
  }
}

/**
 * Cria a OP internamente, validando as referências necessárias
 */
async function createInternalOp(externalOp: OpJerpDto, code: string) {
  const packagingNames = externalOp.embalagens.map((emb) =>
    emb.nome.toUpperCase()
  );

  const transaction = await prisma.$transaction([
    prisma.productType.findFirst({ where: { name: externalOp.produto.nome } }),
    prisma.blisterType.findFirst({ where: { name: { in: packagingNames } } }),
    prisma.boxType.findFirst({ where: { name: { in: packagingNames } } }),
  ]);

  validateReferences(transaction, ["Produto", "Blister", "Caixa"]);

  return await prisma.op.create({
    data: {
      id: externalOp.id,
      code: `${externalOp.numero}`,
      productTypeId: Number(transaction[0]?.id),
      blisterTypeId: Number(transaction[1]?.id),
      boxTypeId: Number(transaction[2]?.id),
      quantityToProduce: externalOp.quantidadeAProduzir,
      OpBox: {
        create: getCollectionToCreateBlisterBoxes(
          externalOp.quantidadeAProduzir,
          transaction[1]!.slots,
          transaction[1]!.limitPerBox
        ),
      },
    },
  });
}

/**
 * Valida se todas as referências existem no banco de dados
 */
function validateReferences(
  transactionResults: [
    productType: ProductType | null,
    blisterType: BlisterType | null,
    boxType: BoxType | null
  ],
  refNames: string[]
) {
  const indexNullReference = transactionResults.findIndex((rf) => !rf?.id);
  if (indexNullReference >= 0) {
    throw new Error(
      `Referência de ${refNames[indexNullReference]} não encontrada.`
    );
  }
}

/**
 * Busca detalhes da OP interna para inspeção
 */
async function fetchOpDetails(internalOp: Op) {
  const transaction = await prisma.$transaction([
    prisma.opBox.count({ where: { opId: internalOp.id } }),
    prisma.opBox.count({ where: { opId: internalOp.id, packedAt: null } }),
    prisma.opBox.findFirst({
      where: { opId: internalOp.id, packedAt: null },
      orderBy: { id: "asc" },
      include: { OpBoxBlister: true },
    }),
    prisma.blisterType.findFirst({ where: { id: internalOp.blisterTypeId } }),
    prisma.boxType.findFirst({ where: { id: internalOp.boxTypeId } }),
    prisma.productType.findFirst({ where: { id: internalOp.productTypeId } }),
    prisma.opBoxBlister.aggregate({
      _sum: { quantity: true },
      where: { packedAt: { not: null }, opBox: { opId: internalOp.id } },
    }),
    prisma.opBoxBlister.findMany({
      select: { code: true },
      where: { opBox: { opId: internalOp.id } },
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
    blisterCodes: transaction[7]?.map((bl) => bl.code) || [],
    itemsPacked: transaction[6]._sum.quantity,
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
        code: bl.code,
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

  if (finalizeOp) {
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
  }

  await prisma.$transaction(queryCollection);
}

export async function persistWithOpBreak(
  boxDto: OpBoxInspectionDto,
  blisters: OpBoxBlisterInspection[],
  opId: number,
  managerId: number
) {
  const { id, status } = boxDto;
  const blistersToRemove = blisters
    .filter((bl) => !bl.packedAt)
    .map((bl) => bl.id) as number[];
  const queryCollection: any[] = blisters
    .filter((bl) => bl.packedAt)
    .map((bl) =>
      prisma.opBoxBlister.update({
        data: {
          packedAt: bl.packedAt?.toISOString(),
          quantity: bl.quantity,
          code: bl.code,
        },
        where: {
          id: bl.id,
          opBoxId: id,
        },
      })
    );
  if (blistersToRemove.length > 0) {
    queryCollection.push(
      prisma.opBoxBlister.deleteMany({
        where: {
          id: {
            in: blistersToRemove,
          },
        },
      })
    );
  }
  queryCollection.push(
    prisma.opBox.update({
      data: {
        packedAt: new Date(),
        status: 2,
        breakAuthorizerId: managerId,
      },
      where: {
        id,
      },
    })
  );

  try {
    // Persist blister and boxes after packeging
    await prisma.$transaction(queryCollection);
    const initialQuantity = await prisma.op.findUnique({
      select: {
        quantityToProduce: true,
      },
      where: {
        id: opId,
      },
    });
    const countPackageItems = await prisma.opBoxBlister.aggregate({
      _sum: {
        quantity: true,
      },
      where: {
        packedAt: {
          not: null,
        },
        opBox: {
          opId,
        },
      },
    });
    if (initialQuantity?.quantityToProduce && countPackageItems._sum.quantity) {
      const quantityPending =
        initialQuantity.quantityToProduce - countPackageItems._sum.quantity;
      await recalculateBoxesFromOpAndItemQuantity(opId, quantityPending);
    } else {
      throw new Error(`Fail to calculate pending quantity by op ID: ${id}`);
    }
  } catch (error) {
    console.log(error);
  }
}

export async function recalculateBoxesFromOpAndItemQuantity(
  opId: number,
  quantityToProduce: number
) {
  const op = await prisma.op.findUnique({
    where: {
      id: opId,
    },
    include: { blister: true, OpBox: true },
  });

  if (!op) {
    throw new Error(`Not found OP with ID: ${opId}`);
  }

  const boxes = getCollectionToCreateBlisterBoxes(
    quantityToProduce,
    op.blister?.slots,
    op.blister?.limitPerBox,
    op.OpBox.length
  );

  await prisma.$transaction([
    prisma.opBoxBlister.deleteMany({
      where: {
        packedAt: null,
        opBox: {
          opId,
        },
      },
    }),
    prisma.opBox.deleteMany({
      where: {
        opId,
        packedAt: null,
      },
    }),
  ]);

  return prisma.op.update({
    data: {
      OpBox: {
        create: boxes,
      },
      status: 2,
    },
    where: {
      id: opId,
    },
  });
}

export async function getOpByCode(code: string) {
  const op = await prisma.op.findFirst({
    where: { code },
    include: { product: true, box: true, blister: true },
  });
  return op
    ? ({
        id: op.id,
        code: op.code,
        status: op.status,
        product: {
          id: op.product.id,
          code: op.product.code,
          name: op.product.name,
        },
        box: {
          id: op.box.id,
          name: op.box.name,
        },
        blister: {
          id: op.blister.id,
          name: op.blister.name,
        },
        productTypeId: op.productTypeId,
        createdAt: op.createdAt,
        quantityToProduce: op.quantityToProduce,
        finishedAt: op.finishedAt,
      } as OpDto)
    : null;
}

// ## ------- INTERNAL FUNCTIONS --------

function getCollectionToCreateBlisterBoxes(
  quantityToProduce: number,
  itemPerBlister: number,
  blisterPerBox: number,
  boxGap: number = 0
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
      code: `${i + 1 + boxGap}`,
      OpBoxBlister: {
        create: Array.from(Array(blisterCount)).map((_, j) => {
          const isLastBlister = j + 1 == blisterCount;
          const quantity =
            isLastBox && isLastBlister ? lastBlisterQuantity : itemPerBlister;
          return {
            code: `${j + 1}`,
            quantity,
          };
        }),
      },
    };
  });
  return boxes;
}
