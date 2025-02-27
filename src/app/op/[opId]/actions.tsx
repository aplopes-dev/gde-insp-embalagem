"use server";

import { getFirstBlisterTypeInNames } from "@/entities/blister-type";
import { getFirstBoxTypeInNames } from "@/entities/box-type";
import { getProductTypeFromName } from "@/entities/product-type";
import db from "@/providers/database";
import { getOpFromId } from "@/shared/services/jerp";
import { handleError } from "@/shared/utils/errorHandler";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { OpDto } from "@/types/op-dto";
import { createOpBoxesData, createOpData } from "@/usecases/op/create-op-data";
import { BlisterType, BoxType, Op, ProductType } from "@prisma/client";
import {
  OpBoxBlisterInspection,
  OpBoxInspectionDto,
  OpInspectionDto,
} from "../../../types/op-box-inspection-dto";

export async function syncAndGetOpToProduceById(id: string) {
  const externalOp = await getOpFromId(id);
  if (!externalOp) {
    throw new Error(`OP ${id} não encontrada na API externa.`);
  }

  let internalOp = await db.op.findFirst({
    where: { code: `${externalOp.numero}` },
  });

  if (!internalOp) {
    internalOp = await createInternalOp(externalOp);
  }

  return await fetchOpDetails(internalOp);
}

/**
 * Cria a OP internamente, validando as referências necessárias
 */
async function createInternalOp(externalOp: OpJerpDto) {
  const packagingNames = externalOp.embalagens.map((emb) =>
    emb.nome.toUpperCase()
  );

  const transaction = await db.$transaction([
    getProductTypeFromName({ name: externalOp.produto.nome }),
    getFirstBlisterTypeInNames({ names: packagingNames }),
    getFirstBoxTypeInNames({ names: packagingNames }),
  ]);

  validateReferences(transaction, ["Produto", "Blister", "Caixa"]);

  const op = createOpData({
    id: externalOp.id,
    code: `${externalOp.numero}`,
    productTypeId: Number(transaction[0]?.id),
    blisterTypeId: Number(transaction[1]?.id),
    boxTypeId: Number(transaction[2]?.id),
    quantityToProduce: externalOp.quantidadeAProduzir,
    blisterPerBox: transaction[1]!.limitPerBox,
    blisterSlots: transaction[1]!.slots,
    boxGap: 0,
  });

  const boxes = [...(op.boxes || [])];
  delete op["boxes"];
  const opCreateData = {
    ...op,
    OpBox: {
      create: boxes?.map((box) => {
        const blisters = [...(box.blisters || [])];
        delete box["blisters"];
        return {
          ...box,
          OpBoxBlister: {
            create: blisters,
          },
        };
      }),
    },
  };

  return await db.op.create({
    data: opCreateData,
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
  const transaction = await db.$transaction([
    db.opBox.count({ where: { opId: internalOp.id } }),
    db.opBox.count({ where: { opId: internalOp.id, packedAt: null } }),
    db.opBox.findFirst({
      where: { opId: internalOp.id, packedAt: null },
      orderBy: { id: "asc" },
      include: { OpBoxBlister: true },
    }),
    db.blisterType.findFirst({ where: { id: internalOp.blisterTypeId } }),
    db.boxType.findFirst({ where: { id: internalOp.boxTypeId } }),
    db.productType.findFirst({ where: { id: internalOp.productTypeId } }),
    db.opBoxBlister.aggregate({
      _sum: { quantity: true },
      where: { packedAt: { not: null }, opBox: { opId: internalOp.id } },
    }),
    db.opBoxBlister.findMany({
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
    db.opBoxBlister.update({
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
    db.opBox.update({
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
      db.op.update({
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

  await db.$transaction(queryCollection);
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
      db.opBoxBlister.update({
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
      db.opBoxBlister.deleteMany({
        where: {
          id: {
            in: blistersToRemove,
          },
        },
      })
    );
  }
  queryCollection.push(
    db.opBox.update({
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
    await db.$transaction(queryCollection);
    const initialQuantity = await db.op.findUnique({
      select: {
        quantityToProduce: true,
      },
      where: {
        id: opId,
      },
    });
    const countPackageItems = await db.opBoxBlister.aggregate({
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
    handleError(error, "Falha ao persistir caixa com quebra");
  }
}

export async function recalculateBoxesFromOpAndItemQuantity(
  opId: number,
  quantityToProduce: number
) {
  const op = await db.op.findUnique({
    where: {
      id: opId,
    },
    include: { blister: true, OpBox: true },
  });

  if (!op) {
    throw new Error(`Not found OP with ID: ${opId}`);
  }

  const boxes = createOpBoxesData({
    quantityToProduce,
    blisterSlots: op.blister?.slots,
    blisterPerBox: op.blister?.limitPerBox,
    boxGap: op.OpBox.length,
  });

  await db.$transaction([
    db.opBoxBlister.deleteMany({
      where: {
        packedAt: null,
        opBox: {
          opId,
        },
      },
    }),
    db.opBox.deleteMany({
      where: {
        opId,
        packedAt: null,
      },
    }),
  ]);

  return db.op.update({
    data: {
      OpBox: {
        create: boxes?.map((box) => {
          const blisters = [...(box.blisters || [])];
          delete box["blisters"];
          return {
            ...box,
            OpBoxBlister: {
              create: blisters,
            },
          };
        }),
      },
      status: 2,
    },
    where: {
      id: opId,
    },
  });
}

export async function getOpByCode(code: string) {
  const op = await db.op.findFirst({
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

export async function saveTagId(opBoxId: number, barCode: string) {
  try {
    await db.opBox.update({
      data: {
        code: barCode,
      },
      where: {
        id: opBoxId,
      },
    });
  } catch (error) {
    console.log(error);
  }
}
