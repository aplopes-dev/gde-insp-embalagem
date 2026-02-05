"use server";

import { findFirstBlisterTypeInIds } from "@/entities/blister-type";
import { findFirstBoxTypeInIds } from "@/entities/box-type";
import { findProductTypeById } from "@/entities/product-type";
import db from "@/providers/database";
import { getOpFromId } from "@/shared/services/jerp";
import { handleError } from "@/shared/utils/errorHandler";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
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
import { authOptions } from "@/libs/auth";
import { connectRabbitMQ } from "@/libs/rabbitmq";

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
      // Se a OP interna ainda não existe, verificamos se já existe um BlisterType correspondente.
      const packagingIds = externalOp.embalagens.map((emb) => emb.id);
      const existingBlisterType = await findFirstBlisterTypeInIds({ ids: packagingIds });

      // Verifica se o JERP já forneceu slots e limitePorCaixa
      const blisterPackagings = externalOp.embalagens.filter((emb) =>
        emb.nome.toLowerCase().includes("blister") ||
        emb.nome.toLowerCase().includes("cartela")
      );
      const blisterFromJerp = blisterPackagings[0];
      const hasJerpConfig = blisterFromJerp?.slots && blisterFromJerp?.limitePorCaixa;

      if (existingBlisterType || hasJerpConfig) {
        // Já existe BlisterType configurado OU o JERP forneceu os dados: podemos criar a OP normalmente.
        const created = await createInternalOp(externalOp!);
        internalOp = created.op;
        requiresSupervisorConfig = false;
      } else {
        // NÃO criar BlisterType nem OP ainda. Retornar payload mínimo pedindo configuração do supervisor.
        const boxPackaging = externalOp.embalagens.find((emb) =>
          emb.nome.toLowerCase().includes("caixa") ||
          emb.nome.toLowerCase().includes("box")
        );

        // Usa o primeiro blister como padrão (será selecionável no dialog)
        const defaultBlisterPackaging = blisterPackagings[0];

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
            code: defaultBlisterPackaging ? `BLISTER_${defaultBlisterPackaging.id}` : "BLISTER_0",
            name: defaultBlisterPackaging?.nome || "Blister",
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
          availableBlisters: blisterPackagings, // Nova propriedade com todos os blisters
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
    OpBox: {
      create: boxes?.map((box) => {
        const blisters = [...(box as any).blisters || []];
        delete (box as any)["blisters"];
        return {
          ...box,
          OpBoxBlister: {
            create: blisters,
          },
        };
      }),
    },
  } as any;

  const createdOp = await db.op.create({
    data: opCreateData,
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
  const blisterPackaging = externalOp.embalagens.find(emb =>
    emb.nome.toLowerCase().includes('blister') ||
    emb.nome.toLowerCase().includes('cartela')
  );
  const boxPackaging = externalOp.embalagens.find(emb =>
    emb.nome.toLowerCase().includes('caixa') ||
    emb.nome.toLowerCase().includes('box')
  );

  if (!blisterPackaging || !boxPackaging) {
    throw new Error(
      `Não foi possível identificar blister e caixa nas embalagens: ${externalOp.embalagens.map(e => e.nome).join(', ')}`
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

  return await db.productType.create({
    data: {
      id: produto.id,
      name: produto.nome,
      code: `PROD_${produto.id}`,
      description: `Produto criado automaticamente do JERP: ${produto.nome}`,
    }
  });
}

async function createBlisterTypeFromJerp(embalagem: { id: number; nome: string; quantidadeAlocada: number; slots?: number; limitePorCaixa?: number }, boxTypeId: number): Promise<BlisterType> {
  console.log(`Criando BlisterType dinamicamente: ID ${embalagem.id}, Nome: ${embalagem.nome}, BoxTypeId: ${boxTypeId}`);

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
    }
  });
}

async function createBoxTypeFromJerp(embalagem: { id: number; nome: string }): Promise<BoxType> {
  console.log(`Criando BoxType dinamicamente: ID ${embalagem.id}, Nome: ${embalagem.nome}`);

  return await db.boxType.create({
    data: {
      id: embalagem.id,
      name: embalagem.nome,
      code: `BOX_${embalagem.id}`,
      description: `Caixa criada automaticamente do JERP: ${embalagem.nome}`,
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
  // Obtém o userId da sessão
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return {
      userId: null,
    };
  }
  const userId = ( session.user as any ).id;

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

  queryCollection.push(
    db.opBox.update({
      data: {
        packedAt: new Date(),
        status: OpBoxStatus.PACKAGED,
      },
      where: {
        id: opBoxId,
      },
    })
  );

  await db.$transaction(queryCollection);

  // Publica direto na fila RabbitMQ (evita fetch interno sem cookie → 401)
  if (userId) {
    try {
      const payload = {
        boxId: opBoxId,
        blisters,
        userId,
      };
      const channel = await connectRabbitMQ();
      channel.sendToQueue('fila_recebimento', Buffer.from(JSON.stringify(payload)), { persistent: true });
    } catch (error) {
      // Silenciosamente falha se não conseguir enviar para RabbitMQ
    }
  }

  return { userId };
}

export async function persistWithOpBreak(
  boxDto: OpBoxInspectionDto,
  blisters: OpBoxBlisterInspection[],
  opId: number,
  authorizerUserId: string | null
) {
  const { id } = boxDto;
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

    if (authorizerUserId) {
      try {
        const authorizer = await db.user.findUnique({
          where: { id: authorizerUserId },
          select: { name: true, email: true },
        });
        if (authorizer) {
          await db.opActivityLog.create({
            data: {
              opId,
              userId: authorizerUserId,
              actionType: "STATUS_CHANGED",
              description: `Quebra de caixa autorizada por ${authorizer.name} (${authorizer.email})`,
              boxId: id,
            },
          });
        }
      } catch (logError) {
        console.error("[persistWithOpBreak] Erro ao registrar autorização no log:", logError);
      }
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
  selectedBlisterPackagingId?: number
): Promise<OpInspectionDto> {
  const externalOpRed = await getOpFromId(`${externalOpId}`);
  if (externalOpRed.isLeft()) {
    throw Error(externalOpRed.getLeft().error);
  }

  const externalOp = externalOpRed.get();
  validateOpJerpToProduce(externalOp);

  // Identifica embalagens
  const blisterPackaging = selectedBlisterPackagingId
    ? externalOp.embalagens.find((emb) => emb.id === selectedBlisterPackagingId)
    : externalOp.embalagens.find((emb) =>
        emb.nome.toLowerCase().includes("blister") ||
        emb.nome.toLowerCase().includes("cartela")
      );
  const boxPackaging = externalOp.embalagens.find((emb) =>
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

  const productType = existingProductType || await createProductTypeFromJerp(externalOp.produto);
  const boxType = existingBoxType || await createBoxTypeFromJerp(boxPackaging);

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
    OpBox: {
      create: boxes?.map((box) => {
        const blisters = [...((box as any).blisters || [])];
        delete (box as any)["blisters"];
        return {
          ...box,
          OpBoxBlister: { create: blisters },
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
  await db.blisterType.update({
    where: { id: blisterTypeId },
    data: { slots, limitPerBox },
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
