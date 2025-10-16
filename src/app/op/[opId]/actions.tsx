"use server";

import { findFirstBlisterTypeInIds } from "@/entities/blister-type";
import { findFirstBoxTypeInIds } from "@/entities/box-type";
import { findProductTypeById } from "@/entities/product-type";
import db from "@/providers/database";
import { getOpFromId } from "@/shared/services/jerp/index";
import { handleError } from "@/shared/utils/errorHandler";
import { OpJerpDto, PackagingJerpDto } from "@/types/dtos/op-jerp-dto";
import { OpDto } from "@/types/op-dto";
import { validateOpJerpToProduce } from "@/usecases/op-jerp/validate-op-jerp-to-produce";
import { createOpBoxesData, createOpData } from "@/usecases/op/create-op-data";
import {
  BlisterType,
  BoxType,
  Op,
  OpBoxStatus,
  OpStatus,
  ProductType,
} from "@prisma/client";
import {
  OpBoxBlisterInspection,
  OpBoxInspectionDto,
  OpInspectionDto,
} from "../../../types/op-box-inspection-dto";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAction } from "@/shared/services/audit";

import { assertUserHasPermission, requirePermissionDb } from "@/shared/auth/permissions-db";

export async function syncAndGetOpToProduceById(id: string) {
  const externalOpRed = await getOpFromId(id);
  if (externalOpRed.isRight()) {
    const externalOp = externalOpRed.get();
    validateOpJerpToProduce(externalOp!);

    let internalOp = await db.op.findFirst({
      where: { code: `${externalOp!.numero}` },
    });

    let requiresSupervisorConfig = false;
    let isNewOp = false;

    if (!internalOp) {
      isNewOp = true;
      // Se a OP interna ainda não existe, verificamos se já existem referências correspondentes.
      const packagingIds = externalOp.embalagens.map((emb: PackagingJerpDto) => emb.id);
      const [existingProductType, existingBlisterType, existingBoxType] = await Promise.all([
        findProductTypeById({ id: externalOp.produto.id }),
        findFirstBlisterTypeInIds({ ids: packagingIds }),
        findFirstBoxTypeInIds({ ids: packagingIds }),
      ]);

      // Se QUALQUER referência estiver faltando, exigimos configuração/autorização do supervisor
      if (existingProductType && existingBlisterType && existingBoxType) {
        // Todas referências já existem: podemos criar a OP normalmente.
        const created = await createInternalOp(externalOp!);
        internalOp = created.op;
        requiresSupervisorConfig = false;
      } else {
        // NÃO criar BlisterType nem OP ainda. Retornar payload mínimo pedindo configuração do supervisor.
        const blisterPackaging = externalOp.embalagens.find((emb: PackagingJerpDto) =>
          emb.nome.toLowerCase().includes("blister") ||
          emb.nome.toLowerCase().includes("cartela")
        );
        const boxPackaging = externalOp.embalagens.find((emb: PackagingJerpDto) =>
          emb.nome.toLowerCase().includes("caixa") ||
          emb.nome.toLowerCase().includes("box")
        );

        requiresSupervisorConfig = true;

        return {
          opId: externalOp.id,
          opCode: `${externalOp.numero}`,
          status: OpStatus.PENDING,
          quantityToProduce: externalOp.quantidadeAProduzir,
          productType: {
            id: externalOp.produto.id,
            code: `PROD_${externalOp.produto.id}`,
            name: externalOp.produto.nome,
            description: `Produto pendente de configuração de blister: ${externalOp.produto.nome}`,
          },
          blisterType: {
            id: 0,
            code: blisterPackaging ? `BLISTER_${blisterPackaging.id}` : "BLISTER_0",
            name: blisterPackaging?.nome || "Blister",
            description: "Configuração de blister pendente (slots/limitPerBox)",
            slots: 0,
            limitPerBox: 0,
          },
          boxType: {
            id: boxPackaging?.id || 0,
            code: boxPackaging ? `BOX_${boxPackaging.id}` : "BOX_0",
            name: boxPackaging?.nome || "Caixa",
            description: boxPackaging?.nome || "",
          },
          itemsPacked: 0,
          totalBoxes: 0,
          pendingBoxes: 0,
          nextBox: undefined,
          createdAt: new Date(),
          finishedAt: undefined,
          blisterCodes: [],
          requiresSupervisorConfig,
          isNewOp,
        } as OpInspectionDto;
      }
    }

    const details = await fetchOpDetails(internalOp);
    return { ...details, requiresSupervisorConfig, isNewOp } as OpInspectionDto;
  } else {
    throw Error(externalOpRed.getLeft().error);
  }
}

async function createInternalOp(externalOp: OpJerpDto): Promise<{ op: Op; created: { product: boolean; blister: boolean; box: boolean } }> {
  // Obtém sessão para auditoria e createdById
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? Number((session.user as any).id) : null;

  const productId = externalOp.produto.id;
  const packagingIds = externalOp.embalagens.map((emb) => emb.id);

  // Busca as referências existentes
  const transaction = await db.$transaction([
    findProductTypeById({ id: productId }),
    findFirstBlisterTypeInIds({ ids: packagingIds }),
    findFirstBoxTypeInIds({ ids: packagingIds }),
  ]);

  // Cria dinamicamente as referências que não existem
  const ensured = await ensureReferencesExist(
    transaction,
    externalOp
  );
  const { productType, blisterType, boxType, created } = ensured;

  const op = createOpData({
    id: externalOp.id,
    code: `${externalOp.numero}`,
    productTypeId: Number(productType.id),
    blisterTypeId: Number(blisterType.id),
    boxTypeId: Number(boxType.id),
    quantityToProduce: externalOp.quantidadeAProduzir,
    blisterPerBox: blisterType.limitPerBox,
    blisterSlots: blisterType.slots,
    boxGap: 0,
  });

  const boxes = [...(op.boxes || [])];
  delete (op as any)["boxes"];
  const opCreateData = {
    ...op,
    createdById: currentUserId ?? undefined,
    OpBox: {
      create: boxes?.map((box) => {
        const blisters = [...((box as any).blisters || [])];
        delete (box as any)["blisters"];
        return {
          ...box,
          createdById: currentUserId ?? undefined,
          OpBoxBlister: {
            create: blisters.map((bl: any) => ({
              ...bl,
              createdById: currentUserId ?? undefined,
            })),
          },
        };
      }),
    },
  } as any;

  const createdOp = await db.op.create({
    data: opCreateData,
  });

  // Auditoria: criação de OP
  await logAction({
    userId: currentUserId ?? undefined,
    action: "CREATE_OP",
    entity: "Op",
    entityId: String(createdOp.id),
    before: {},
    after: { code: createdOp.code, productTypeId: createdOp.productTypeId, blisterTypeId: createdOp.blisterTypeId, boxTypeId: createdOp.boxTypeId },
  });

  return { op: createdOp, created };
}

async function ensureReferencesExist(
  transactionResults: [
    productType: ProductType | null,
    blisterType: BlisterType | null,
    boxType: BoxType | null
  ],
  externalOp: OpJerpDto
): Promise<{ productType: ProductType; blisterType: BlisterType; boxType: BoxType; created: { product: boolean; blister: boolean; box: boolean } }> {
  const [existingProductType, existingBlisterType, existingBoxType] = transactionResults;

  const createdFlags = { product: false, blister: false, box: false };

  // Cria ProductType se não existir
  const productType = existingProductType || await (async () => {
    createdFlags.product = true;
    return createProductTypeFromJerp(externalOp.produto);
  })();

  // Identifica qual embalagem é blister e qual é caixa baseado no nome
  const blisterPackaging = externalOp.embalagens.find((emb: PackagingJerpDto) =>
    emb.nome.toLowerCase().includes('blister') ||
    emb.nome.toLowerCase().includes('cartela')
  );
  const boxPackaging = externalOp.embalagens.find((emb: PackagingJerpDto) =>
    emb.nome.toLowerCase().includes('caixa') ||
    emb.nome.toLowerCase().includes('box')
  );

  if (!blisterPackaging || !boxPackaging) {
    throw new Error(
      `Não foi possível identificar blister e caixa nas embalagens: ${externalOp.embalagens.map((e: PackagingJerpDto) => e.nome).join(', ')}`
    );
  }

  // Cria BoxType primeiro (necessário para BlisterType)
  const boxType = existingBoxType || await (async () => {
    createdFlags.box = true;
    return createBoxTypeFromJerp(boxPackaging);
  })();

  // Cria BlisterType se não existir (precisa do boxTypeId)
  const blisterType = existingBlisterType || await (async () => {
    createdFlags.blister = true;
    return createBlisterTypeFromJerp(blisterPackaging, boxType.id);
  })();

  return { productType, blisterType, boxType, created: createdFlags };
}

async function createProductTypeFromJerp(produto: { id: number; nome: string }): Promise<ProductType> {
  console.log(`Criando ProductType dinamicamente: ID ${produto.id}, Nome: ${produto.nome}`);
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? Number((session.user as any).id) : null;

  return await db.productType.create({
    data: {
      id: produto.id,
      name: produto.nome,
      code: `PROD_${produto.id}`,
      description: `Produto criado automaticamente do JERP: ${produto.nome}`,
      createdById: currentUserId ?? undefined,
    }
  });
}

async function createBlisterTypeFromJerp(embalagem: { id: number; nome: string; quantidadeAlocada: number; slots?: number; limitePorCaixa?: number }, boxTypeId: number): Promise<BlisterType> {
  console.log(`Criando BlisterType dinamicamente: ID ${embalagem.id}, Nome: ${embalagem.nome}, BoxTypeId: ${boxTypeId}`);
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? Number((session.user as any).id) : null;

  // Usa os novos campos do JERP se disponíveis, senão usa valores padrão
  const slots = embalagem.slots || embalagem.quantidadeAlocada || 10;
  const limitPerBox = embalagem.limitePorCaixa || 1;

  console.log(`Usando slots: ${slots}, limitPerBox: ${limitPerBox} ${embalagem.slots ? '(do JERP)' : '(padrão)'}`);

  return await db.blisterType.create({
    data: {
      id: embalagem.id,
      name: embalagem.nome,
      code: `BLISTER_${embalagem.id}`,
      description: `Blister criado automaticamente do JERP: ${embalagem.nome}`,
      slots: slots,
      limitPerBox: limitPerBox,
      boxTypeId: boxTypeId, // Campo obrigatório
      createdById: currentUserId ?? undefined,
    }
  });
}

async function createBoxTypeFromJerp(embalagem: { id: number; nome: string }): Promise<BoxType> {
  console.log(`Criando BoxType dinamicamente: ID ${embalagem.id}, Nome: ${embalagem.nome}`);
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? Number((session.user as any).id) : null;

  return await db.boxType.create({
    data: {
      id: embalagem.id,
      name: embalagem.nome,
      code: `BOX_${embalagem.id}`,
      description: `Caixa criada automaticamente do JERP: ${embalagem.nome}`,
      createdById: currentUserId ?? undefined,
    }
  });
}



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
  opBoxId: string,
  blisters: OpBoxBlisterInspection[]
) {
  const queryCollection: any[] = blisters.map((bl) =>
    db.opBoxBlister.update({
      data: {
        packedAt: bl.packedAt?.toISOString(),
        code: bl.code,
      },
      where: {
        id: bl.id,
        opBoxId,
      },
    })
  );

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? Number((session.user as any).id) : null;

  queryCollection.push(
    db.opBox.update({
      data: {
        packedAt: new Date(),
        status: OpBoxStatus.PACKAGED,
        finalizedById: currentUserId ?? undefined,
      },
      where: {
        id: opBoxId,
      },
    })
  );

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
    .map((bl) => bl.id) as string[];
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
        status: OpBoxStatus.PACKAGED_W_BREAK,
        finalizedById: Number(managerId),
      },
      where: {
        id,
      },
    })
  );

      // Auditoria: finaliza e7 e3o de caixa com quebra
      {
        const session = await getServerSession(authOptions);
        const currentUserId = session?.user ? Number((session.user as any).id) : null;
        await logAction({
          userId: currentUserId ?? undefined,
          action: "FINALIZE_BOX_WITH_BREAK",
          entity: "OpBox",
          entityId: String(id),
          before: {},
          after: { operatorUserId: managerId, opId, status },
        });
      }

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
    },
    where: {
      id: opId,
    },
  });
}

export async function getOpById(id: number) {
  const op = await db.op.findUnique({
    where: { id },
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
          description: op.product.description,
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

export async function createOpAfterSupervisorConfig(
  externalOpId: number,
  slots: number,
  limitPerBox: number,
  supervisorUserId: number
): Promise<OpInspectionDto> {
  const externalOpRed = await getOpFromId(`${externalOpId}`);
  if (externalOpRed.isLeft()) {
    throw Error(externalOpRed.getLeft().error);
  }


  // RBAC: exige permissão CAN_EDIT_CATALOG para o supervisor/autor
  await assertUserHasPermission(Number(supervisorUserId), "CAN_EDIT_CATALOG");

  const externalOp = externalOpRed.get();
  validateOpJerpToProduce(externalOp);

  // Identifica embalagens
  const blisterPackaging = externalOp.embalagens.find((emb: PackagingJerpDto) =>
    emb.nome.toLowerCase().includes("blister") ||
    emb.nome.toLowerCase().includes("cartela")
  );
  const boxPackaging = externalOp.embalagens.find((emb: PackagingJerpDto) =>
    emb.nome.toLowerCase().includes("caixa") ||
    emb.nome.toLowerCase().includes("box")
  );

  if (!blisterPackaging || !boxPackaging) {
    throw new Error(
      `Não foi possível identificar blister e caixa nas embalagens: ${externalOp.embalagens.map(e => e.nome).join(', ')}`
    );
  }

  // Garante ProductType e BoxType
  const [existingProductType, existingBoxType] = await db.$transaction([
    findProductTypeById({ id: externalOp.produto.id }),
    findFirstBoxTypeInIds({ ids: [boxPackaging.id] }),
  ]);

  const productType = existingProductType || await db.productType.create({
    data: {
      id: externalOp.produto.id,
      name: externalOp.produto.nome,
      code: `PROD_${externalOp.produto.id}`,
      description: `Produto criado automaticamente do JERP: ${externalOp.produto.nome}`,
      createdById: supervisorUserId,
    }
  });
  const boxType = existingBoxType || await db.boxType.create({
    data: {
      id: boxPackaging.id,
      name: boxPackaging.nome,
      code: `BOX_${boxPackaging.id}`,
      description: `Caixa criada automaticamente do JERP: ${boxPackaging.nome}`,
      createdById: supervisorUserId,
    }
  });

  // Cria BlisterType com os parâmetros informados
  const blisterType = await db.blisterType.create({
    data: {
      id: blisterPackaging.id,
      name: blisterPackaging.nome,
      code: `BLISTER_${blisterPackaging.id}`,
      description: `Blister criado automaticamente do JERP: ${blisterPackaging.nome}`,
      slots: Number(slots),
      limitPerBox: Number(limitPerBox),
      boxTypeId: boxType.id,
      createdById: supervisorUserId,
    }
  });

  // Cria OP com base nos parâmetros de blister
  const opData = createOpData({
    id: externalOp.id,
    code: `${externalOp.numero}`,
    productTypeId: Number(productType.id),
    blisterTypeId: Number(blisterType.id),
    boxTypeId: Number(boxType.id),
    quantityToProduce: externalOp.quantidadeAProduzir,
    blisterPerBox: blisterType.limitPerBox,
    blisterSlots: blisterType.slots,
    boxGap: 0,
  });

  const boxes = [...(opData.boxes || [])];
  delete (opData as any)["boxes"];
  const opCreateData = {
    ...opData,
    createdById: supervisorUserId,
    OpBox: {
      create: boxes?.map((box) => {
        const blisters = [...((box as any).blisters || [])];
        delete (box as any)["blisters"];
        return {
          ...box,
          createdById: supervisorUserId,
          OpBoxBlister: {
            create: blisters.map((bl: any) => ({
              ...bl,
              createdById: supervisorUserId,
            })),
          },
        };
      }),
    },
  } as any;

  const createdOp = await db.op.create({ data: opCreateData });
  const details = await fetchOpDetails(createdOp);
  return { ...details, isNewOp: true } as OpInspectionDto;
}


export async function saveTagId(opBoxId: string, barCode: string) {
  try {
    await db.opBox.update({
      data: {
        barCode,
        barCodeGeneratedAt: new Date(),
      },

      where: {
        id: opBoxId,
      },
    });
  } catch (error) {

    console.log(error);
  }
}


export async function updateBlisterTypeParams(blisterTypeId: number, slots: number, limitPerBox: number) {
  // RBAC: somente quem tem CAN_EDIT_CATALOG pode alterar BlisterType
  await requirePermissionDb("CAN_EDIT_CATALOG");

  const before = await db.blisterType.findUnique({
    where: { id: blisterTypeId },
    select: { slots: true, limitPerBox: true },
  });
  const updated = await db.blisterType.update({
    where: { id: blisterTypeId },
    data: { slots, limitPerBox },
  });
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? Number((session.user as any).id) : null;
  await logAction({
    userId: currentUserId ?? undefined,
    action: "UPDATE_BLISTER_TYPE",
    entity: "BlisterType",
    entityId: String(blisterTypeId),
    before,
    after: { slots: updated.slots, limitPerBox: updated.limitPerBox },
  });
}

export async function opCompletionNowHandler(opId: number) {
  const opWithBoxes = await db.op.findUnique({
    where: { id: opId },
    include: {
      OpBox: true,
    },

  });

  if (opWithBoxes && !opWithBoxes?.finishedAt) {
    const allBoxesCompleted = opWithBoxes.OpBox.every(
      (box) => box.packedAt !== null && box.barCodeGeneratedAt !== null
    );

    if (allBoxesCompleted) {
      const finishedNow = await db.op.update({
        where: {
          id: opId,
        },
        data: {
          finishedAt: new Date(),
          status: OpStatus.COMPLETED
        },
      });

      return !!finishedNow;
    }
  }
  return false;
}
