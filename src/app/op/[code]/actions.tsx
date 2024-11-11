"use server";

import { OpDto } from "@/app/(home)/_types/op-dto";
import { getOpFromNexinToProduceByCode } from "@/app/(home)/actions";
import prisma from "@/providers/database";
import { isSamePass } from "@/utils/bcrypt";
import {
  OpBoxBlisterInspection,
  OpBoxInspectionDto,
  OpInspectionDto,
} from "../types/op-box-inspection-dto";

const bcrypt = require("bcrypt");

export async function syncAndGetOpToProduceByCode(code: string) {
  const externalOp = await getOpFromNexinToProduceByCode(code);
  let internalOp = await prisma.op.findFirst({
    where: {
      code: `${externalOp.numero}`,
    },
  });

  if (!internalOp) {
    const refNames = ["Produto", "Blister", "Caixa"];
    const packagingNames = externalOp.embalagens.map((emb) =>
      emb.nome.toUpperCase()
    );
    const refValue = [`${externalOp.produto.nome}`];
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
          name: {
            in: packagingNames,
          },
        },
        select: {
          id: true,
          limitPerBox: true,
          slots: true,
        },
      }),
      prisma.boxType.findFirst({
        where: {
          name: {
            in: packagingNames,
          },
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
        code: `${externalOp.numero}`,
        productTypeId: Number(transaction[0]?.id),
        blisterTypeId: Number(transaction[1]?.id),
        boxTypeId: Number(transaction[2]?.id),
        quantityToProduce: externalOp.quantidadeAProduzir,
        OpBox: {
          create: getCollectionToCreateBlisterBoxes(
            `OP${code}-BX`,
            externalOp.quantidadeAProduzir,
            transaction[1]!.slots,
            transaction[1]!.limitPerBox
          ),
        },
      },
    });
  }

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
    prisma.opBoxBlister.aggregate({
      _sum: {
        quantity: true,
      },
      where: {
        packedAt: {
          not: null,
        },
        opBox: {
          opId: internalOp.id,
        },
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

// export async function finalizeAndRemovePendingRelationsByOpCode(opId: number) {
//   await prisma.$transaction([
//     prisma.opBoxBlister.deleteMany({
//       where: {
//         packedAt: null,
//         opBox: {
//           opId,
//         },
//       },
//     }),
//     prisma.opBox.deleteMany({
//       where: {
//         opId,
//         packedAt: null,
//       },
//     }),
//     prisma.op.update({
//       data: {
//         finishedAt: new Date(),
//         status: 2,
//       },
//       where: {
//         id: opId,
//       },
//     }),
//   ]);
// }

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
        status: status,
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
          quantityToProduce: true
        },
        where: {
          id: opId,
        },
      },
    );
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
      const quantityPending = initialQuantity.quantityToProduce - countPackageItems._sum.quantity;
      await recalculateBoxesFromOpAndItemQuantity(opId, quantityPending);
    } else {
      throw new Error(`Fail to calculate pending quantity by op ID: ${id}`);
    }
  } catch (error) {
    console.log(error);
  }
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

export async function managarAuthorization(code: string, password: string) {
  const manager = await prisma.manager.findUnique({
    where: {
      id: Number(code),
    },
  });
  const managerPassword = manager?.password || "";
  const confirmPass = await isSamePass(password, managerPassword);
  if (!confirmPass) {
    throw new Error("Código / Senha inválidos!");
  }
  return manager && manager.id;
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
    `OP${op.code}-BX`,
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
      status: 2
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

export async function getBarcodeFromOpId(id: number, quantity: number) {
  // Requet from jerp:
  /*
  const dynamicData = await fetch(
    `https://jerpapiprod.azurewebsites.net/api/ordemproducao`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.JERP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        quantidadeApontada: quantity,
      }),
    }
  );
  const data = await dynamicData.json();
  return data;
  */
  // return data as OpJerpDto;

  return {
    message: "Apontamento com sucesso",
    id: id,
    quantidadeApontada: quantity,
    idBarras: 992790,
  };
}

export async function getBoxById(id: number) {
  const box = await prisma.opBox.findUnique({
    where: {
      id,
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
      code: `${boxTagPrefix}-${i + 1 + boxGap}`,
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
