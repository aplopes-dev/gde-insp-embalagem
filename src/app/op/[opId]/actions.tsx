"use server";

import { findFirstBlisterTypeInIds } from "@/entities/blister-type";
import { findFirstBoxTypeInIds } from "@/entities/box-type";
import { findProductTypeById } from "@/entities/product-type";
import db from "@/providers/database";
import logger from "@/libs/logger";
import { getOpFromCode, getOpFromId } from "@/shared/services/jerp";
import { handleError } from "@/shared/utils/errorHandler";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { OpDto } from "@/types/op-dto";
import { validateOpJerpToProduce } from "@/usecases/op-jerp/validate-op-jerp-to-produce";
import { selectOpPackagings, SelectedOpPackagings } from "@/usecases/op-jerp/select-op-packagings";
import { findBlisterConfigFromProductHistory } from "@/usecases/op-jerp/find-blister-config-from-product-history";
import {
  PieceRegistrationResolution,
  PieceRegistrationSource,
  resolvePieceRegistration,
} from "@/usecases/op-jerp/resolve-piece-registration";
import {
  getPackedQuantityForOp,
  reconcileOpQuantityWithJerp,
  resolvePendingQuantity,
} from "@/usecases/op-jerp/reconcile-op-quantity-with-jerp";
import {
  createOpBoxesData,
  createOpData,
  maxPackedOpBoxCode,
} from "@/usecases/op/create-op-data";
import { findNextPendingOpBox } from "@/usecases/op/find-next-pending-op-box";
import {
  claimNextPendingOpBox,
} from "@/usecases/op/claim-next-pending-op-box";
import {
  findConflictingPackedBlisterCodes,
  findDuplicateCodesInBatch,
} from "@/usecases/op/assert-blister-codes-unique-in-op";
import { assertOpBoxBlistersMutable } from "@/usecases/op/assert-op-box-blisters-mutable";
import {
  getAuthoritativeBoxPackedSummary,
  type AuthoritativeBoxPackedSummary,
} from "@/usecases/op-jerp/get-authoritative-box-packed-summary";
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
async function findInternalOpByRouteId(id: string) {
  const numericId = Number(id);
  return db.op.findFirst({
    where: {
      OR: [
        ...(Number.isFinite(numericId) ? [{ id: numericId }] : []),
        { code: id },
      ],
    },
  });
}

export async function syncAndGetOpToProduceById(id: string) {
  const session = await getServerSession(authOptions);
  const userId = session?.user
    ? ((session.user as { id?: string }).id ?? null)
    : null;

  let externalOpRed = await getOpFromId(id);
  if (externalOpRed.isLeft()) {
    externalOpRed = await getOpFromCode(id);
  }

  if (externalOpRed.isRight()) {
    const externalOp = externalOpRed.get();
    validateOpJerpToProduce(externalOp!);

    let internalOp = await db.op.findFirst({
      where: { code: `${externalOp!.numero}` },
    });

    let requiresSupervisorConfig = false;
    let isNewOp = false;
    let registrationSource: PieceRegistrationSource | undefined;

    if (!internalOp) {
      isNewOp = true;
      const packagings = selectOpPackagings(externalOp);
      const { blisterPackaging } = packagings;

      const existingBlisterType = blisterPackaging
        ? await findFirstBlisterTypeInIds({ ids: [blisterPackaging.id] })
        : null;

      const historyBlisterConfig = await findBlisterConfigFromProductHistory(
        externalOp.produto.id
      );

      const resolution = resolvePieceRegistration({
        blisterPackaging,
        existingBlisterType,
        historyBlisterConfig,
      });

      if (resolution.mode === "auto") {
        const blisterOverride =
          resolution.source === "history"
            ? { slots: resolution.slots, limitPerBox: resolution.limitPerBox }
            : undefined;

        const created = await createInternalOp(externalOp!, blisterOverride);
        internalOp = created.op;
        requiresSupervisorConfig = false;
        registrationSource = resolution.source;
      } else {
        requiresSupervisorConfig = true;
        return buildPendingSupervisorPayload(externalOp, packagings, resolution);
      }
    }

    if (internalOp) {
      const pendingBoxCount = await db.opBox.count({
        where: { opId: internalOp.id, packedAt: null },
      });
      if (pendingBoxCount === 0) {
        internalOp = await reconcileOpQuantityWithJerp(internalOp, externalOp);
      }
    }

    const details = await fetchOpDetails(internalOp, userId);
    return {
      ...details,
      requiresSupervisorConfig,
      isNewOp,
      registrationSource,
    } as OpInspectionDto;
  }

  const internalOp = await findInternalOpByRouteId(id);
  if (internalOp) {
    const details = await fetchOpDetails(internalOp, userId);
    return {
      ...details,
      requiresSupervisorConfig: false,
      isNewOp: false,
    } as OpInspectionDto;
  }

  throw Error(externalOpRed.getLeft().error);
}

type BlisterConfigOverride = {
  slots: number;
  limitPerBox: number;
};

function buildPendingSupervisorPayload(
  externalOp: OpJerpDto,
  packagings: SelectedOpPackagings,
  resolution: Extract<PieceRegistrationResolution, { mode: "supervisor" }>
): OpInspectionDto {
  const {
    blisterPackagings,
    blisterPackaging,
    boxPackaging,
    preferredBlisterPackagingId,
  } = packagings;
  const defaultBlisterPackaging = blisterPackaging || blisterPackagings[0];

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
      slots: resolution.partialData?.slots ?? 0,
      limitPerBox: resolution.partialData?.limitPerBox ?? 0,
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
    requiresSupervisorConfig: true,
    isNewOp: true,
    availableBlisters: blisterPackagings,
    preferredBlisterPackagingId,
    supervisorConfigReason: resolution.reason,
  };
}

async function createInternalOp(
  externalOp: OpJerpDto,
  blisterConfigOverride?: BlisterConfigOverride
): Promise<{ op: Op; created: { product: boolean; blister: boolean; box: boolean } }> {
  const productId = externalOp.produto.id;
  const { blisterPackaging, boxPackaging } = selectOpPackagings(externalOp);

  if (!blisterPackaging || !boxPackaging) {
    throw new Error(
      `Não foi possível identificar blister e caixa nas embalagens: ${externalOp.embalagens.map((e) => e.nome).join(", ")}`
    );
  }

  // Busca as referências existentes
  const transaction = await db.$transaction([
    findProductTypeById({ id: productId }),
    findFirstBlisterTypeInIds({ ids: [blisterPackaging.id] }),
    findFirstBoxTypeInIds({ ids: [boxPackaging.id] }),
  ]);

  // Cria dinamicamente as referências que não existem
  const ensured = await ensureReferencesExist(
    transaction,
    externalOp,
    blisterPackaging,
    boxPackaging,
    blisterConfigOverride
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
  externalOp: OpJerpDto,
  blisterPackaging: { id: number; nome: string; quantidadeAlocada: number; slots?: number; limitePorCaixa?: number },
  boxPackaging: { id: number; nome: string },
  blisterConfigOverride?: BlisterConfigOverride
): Promise<{ productType: ProductType; blisterType: BlisterType; boxType: BoxType; created: { product: boolean; blister: boolean; box: boolean } }> {
  const [existingProductType, existingBlisterType, existingBoxType] = transactionResults;

  const createdFlags = { product: false, blister: false, box: false };

  // Cria ProductType se não existir
  const productType = existingProductType || await (async () => {
    createdFlags.product = true;
    return createProductTypeFromJerp(externalOp.produto);
  })();

  // Cria BoxType primeiro (necessário para BlisterType)
  const boxType = existingBoxType || await (async () => {
    createdFlags.box = true;
    return createBoxTypeFromJerp(boxPackaging);
  })();

  // Cria BlisterType se não existir (precisa do boxTypeId)
  const blisterType = existingBlisterType || await (async () => {
    createdFlags.blister = true;
    return createBlisterTypeFromJerp(
      blisterPackaging,
      boxType.id,
      blisterConfigOverride
    );
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

async function createBlisterTypeFromJerp(
  embalagem: { id: number; nome: string; quantidadeAlocada: number; slots?: number; limitePorCaixa?: number },
  boxTypeId: number,
  override?: BlisterConfigOverride
): Promise<BlisterType> {
  console.log(`Criando BlisterType dinamicamente: ID ${embalagem.id}, Nome: ${embalagem.nome}, BoxTypeId: ${boxTypeId}`);

  const slots = override?.slots ?? embalagem.slots;
  const limitPerBox = override?.limitPerBox ?? embalagem.limitePorCaixa;

  if (!slots || !limitPerBox) {
    throw new Error(
      `Blister ${embalagem.nome} sem slots/limitePorCaixa definidos no JERP`
    );
  }

  const source = override ? "histórico" : "JERP";
  console.log(`Usando slots: ${slots}, limitPerBox: ${limitPerBox} (fonte: ${source})`);

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



async function fetchOpDetails(internalOp: Op, userId?: string | null) {
  const [transaction, nextBox] = await Promise.all([
    db.$transaction([
      db.opBox.count({ where: { opId: internalOp.id } }),
      db.opBox.count({ where: { opId: internalOp.id, packedAt: null } }),
      db.blisterType.findFirst({ where: { id: internalOp.blisterTypeId } }),
      db.boxType.findFirst({ where: { id: internalOp.boxTypeId } }),
      db.productType.findFirst({ where: { id: internalOp.productTypeId } }),
      db.opBoxBlister.aggregate({
        _sum: { quantity: true },
        where: { packedAt: { not: null }, opBox: { opId: internalOp.id } },
      }),
      // Apenas QR já embalados — usado no cliente para bloquear reutilização.
      // Placeholders GEN_* e blisters pendentes não entram nesta lista.
      db.opBoxBlister.findMany({
        select: { code: true },
        where: {
          packedAt: { not: null },
          opBox: { opId: internalOp.id },
          NOT: { code: { startsWith: "GEN_" } },
        },
      }),
    ]),
    userId
      ? claimNextPendingOpBox(internalOp.id, userId)
      : findNextPendingOpBox(internalOp.id),
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
    blisterCodes: transaction[6]?.map((bl) => bl.code) || [],
    itemsPacked: transaction[5]._sum.quantity,
    productType: transaction[4],
    blisterType: transaction[2],
    boxType: transaction[3],
    totalBoxes: transaction[0],
    pendingBoxes: transaction[1],
    nextBox: nextBox || undefined,
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

  await assertOpBoxBlistersMutable(opBoxId);

  const box = await db.opBox.findUnique({
    where: { id: opBoxId },
    select: { opId: true },
  });
  if (!box) {
    throw new Error("Caixa não encontrada para persistência.");
  }

  const packedCodes = blisters
    .filter((bl) => bl.packedAt)
    .map((bl) => bl.code);
  const duplicatesInBox = findDuplicateCodesInBatch(packedCodes);
  if (duplicatesInBox.length > 0) {
    throw new Error(
      `QR de blister repetido na mesma caixa: ${duplicatesInBox.join(", ")}`
    );
  }
  const conflicts = await findConflictingPackedBlisterCodes(
    box.opId,
    opBoxId,
    packedCodes
  );
  if (conflicts.length > 0) {
    throw new Error(
      `Blister já embalado noutra caixa desta OP: ${conflicts.join(", ")}`
    );
  }

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
        inspectionLockedByUserId: null,
        inspectionLockedAt: null,
      },
      where: {
        id: opBoxId,
      },
    })
  );

  await db.$transaction(queryCollection);

  return { userId };
}

/**
 * Restante a produzir segundo o JERP (fonte de verdade).
 * Retorna null quando o JERP está indisponível, para permitir fallback local.
 */
async function getJerpRemainingQuantity(opId: number): Promise<number | null> {
  const red = await getOpFromId(String(opId));
  if (red.isLeft()) {
    handleError(
      red.getLeft(),
      `Falha ao obter quantidade restante do JERP para OP ${opId}`
    );
    return null;
  }
  return red.get().quantidadeAProduzir ?? null;
}

/** Registra divergência entre pendente interno e restante do JERP (item 8). */
async function logJerpDivergence(
  opId: number,
  boxId: string | null,
  userId: string | null,
  details: Record<string, unknown>
) {
  if (!userId) return;
  try {
    await db.opActivityLog.create({
      data: {
        opId,
        userId,
        actionType: "STATUS_CHANGED",
        description: `Divergência JERP x interno detectada (JERP restante: ${details.jerpRemaining}, interno: ${details.localPending}).`,
        boxId: boxId ?? undefined,
        details: details as any,
      },
    });
  } catch (error) {
    logger.error({
      message: "Falha ao registrar divergência JERP x interno no log.",
      error,
    });
  }
}

export async function persistWithOpBreak(
  boxDto: OpBoxInspectionDto,
  blisters: OpBoxBlisterInspection[],
  opId: number,
  authorizerUserId: string | null
) {
  const { id } = boxDto;
  await assertOpBoxBlistersMutable(id);

  const packedCodes = blisters
    .filter((bl) => bl.packedAt)
    .map((bl) => bl.code);
  const duplicatesInBox = findDuplicateCodesInBatch(packedCodes);
  if (duplicatesInBox.length > 0) {
    throw new Error(
      `QR de blister repetido na mesma caixa: ${duplicatesInBox.join(", ")}`
    );
  }
  const conflicts = await findConflictingPackedBlisterCodes(
    opId,
    id,
    packedCodes
  );
  if (conflicts.length > 0) {
    throw new Error(
      `Blister já embalado noutra caixa desta OP: ${conflicts.join(", ")}`
    );
  }

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
        inspectionLockedByUserId: null,
        inspectionLockedAt: null,
      },
      where: {
        id,
      },
    })
  );

  try {
    // Persist blister and boxes after packeging
    await db.$transaction(queryCollection);

    const opRecord = await db.op.findUnique({
      select: {
        code: true,
        quantityToProduce: true,
      },
      where: {
        id: opId,
      },
    });
    const countPackageItems = await db.opBoxBlister.aggregate({
      _sum: { quantity: true },
      where: { packedAt: { not: null }, opBox: { opId } },
    });
    const currentBoxAgg = await db.opBoxBlister.aggregate({
      _sum: { quantity: true },
      where: { packedAt: { not: null }, opBoxId: id },
    });

    const totalToProduce = opRecord?.quantityToProduce ?? 0;
    const allPackedLocal = countPackageItems._sum.quantity ?? 0;
    const currentBoxPacked = currentBoxAgg._sum.quantity ?? 0;

    // Pendente local (fonte antiga): total planejado − tudo já embalado.
    const localPending = totalToProduce - allPackedLocal;

    // Pendente derivado do JERP (fonte de verdade). No momento da quebra
    // a caixa atual ainda não foi apontada no JERP, então subtraímos o que
    // acabou de ser embalado nela para obter o restante após esta caixa.
    const jerpRemaining = await getJerpRemainingQuantity(opId);
    let quantityPending = localPending;

    if (jerpRemaining != null) {
      quantityPending = jerpRemaining - currentBoxPacked;

      if (quantityPending !== localPending) {
        logger.warn({
          message:
            "Pendente interno diverge do restante do JERP na quebra (usando JERP).",
          opId,
          boxId: id,
          localPending,
          jerpRemaining,
          currentBoxPacked,
          quantityPending,
        });
        await logJerpDivergence(opId, id, authorizerUserId, {
          event: "BREAK_PENDING_DIVERGENCE",
          localPending,
          jerpRemaining,
          currentBoxPacked,
          quantityPending,
        });
      }
    }

    await recalculateBoxesFromOpAndItemQuantity(
      opId,
      Math.max(0, quantityPending)
    );

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

  // Sempre remove as caixas/blisters pendentes (não embalados) antes de recriar.
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

  // Nada pendente: não há caixas a recriar (ex.: OP já concluída no JERP).
  if (quantityToProduce <= 0) {
    return db.op.findUnique({ where: { id: opId } });
  }

  // Continua a partir do maior `code` das caixas já embaladas.
  // Pendentes são apagadas acima e não entram no gap — senão a numeração
  // salta (ex.: após caixa 8 com pendentes 9–19, próximo seria 20 em vez de 9).
  const maxCode = maxPackedOpBoxCode(op.OpBox);

  const boxes = createOpBoxesData({
    quantityToProduce,
    blisterSlots: op.blister?.slots,
    blisterPerBox: op.blister?.limitPerBox,
    boxGap: maxCode,
  });

  const itemsPacked = await getPackedQuantityForOp(opId);


  return db.op.update({
    data: {
      quantityToProduce: itemsPacked + quantityToProduce,
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

  const { blisterPackaging: preferredBlisterPackaging, boxPackaging } =
    selectOpPackagings(externalOp);

  const blisterPackaging = selectedBlisterPackagingId
    ? externalOp.embalagens.find((emb) => emb.id === selectedBlisterPackagingId)
    : preferredBlisterPackaging;

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


/**
 * Grava o barcode só se a caixa ainda não tiver um.
 * Evita sobrescrever num race de dois apontamentos JERP consecutivos.
 * @returns true se gravou, false se a caixa já tinha barcode.
 */
export async function saveTagId(opBoxId: string, barCode: string): Promise<boolean> {
  try {
    const result = await db.opBox.updateMany({
      where: {
        id: opBoxId,
        barCode: null,
      },
      data: {
        barCode,
        barCodeGeneratedAt: new Date(),
      },
    });
    if (result.count === 0) {
      logger.warn({
        message:
          "Barcode JERP ignorado: caixa já possui etiqueta (idempotência).",
        opBoxId,
        barCode,
      });
      return false;
    }
    return true;
  } catch (error) {
    logger.error({ message: "Falha ao gravar barcode da caixa", opBoxId, error });
    return false;
  }
}

/** Lê o barcode já persistido na caixa (para resposta idempotente). */
export async function getBoxBarCode(opBoxId: string): Promise<string | null> {
  const box = await db.opBox.findUnique({
    where: { id: opBoxId },
    select: { barCode: true },
  });
  return box?.barCode ?? null;
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

/** Quantidade embalada na caixa — lida do banco após persistir a inspeção. */
export async function fetchAuthoritativePackedBoxSummary(
  boxId: string
): Promise<AuthoritativeBoxPackedSummary | null> {
  return getAuthoritativeBoxPackedSummary(boxId);
}

/**
 * Persiste INVALID/TIMEOUT no histórico (OpActivityLog + InspectionImage).
 * Chamado pelo frontend ao receber detectionUpdate — fire-and-forget no cliente.
 */
export async function persistInspectionDetectionEvent(input: {
  opId: number;
  boxId?: string | null;
  step: string;
  status: "INVALID" | "TIMEOUT";
  reason?: string | null;
  confidence?: number | null;
  defectLabels?: string[];
  deviceId?: string | null;
  workerId?: string | null;
  imageFilename?: string | null;
  storagePath?: string | null;
  capturedAt?: string | null;
  extraDetails?: Record<string, unknown>;
}) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return { ok: false as const, error: "Não autenticado" };
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });
  if (!user || (user.role !== "OPERADOR" && user.role !== "SUPERVISOR" && user.role !== "AUDITOR")) {
    return { ok: false as const, error: "Sem permissão" };
  }

  const { persistDetectionEvent } = await import(
    "@/usecases/detection/persist-detection-event"
  );

  try {
    const result = await persistDetectionEvent({
      ...input,
      userId: user.id,
      capturedAt: input.capturedAt ?? undefined,
    });
    return { ok: true as const, result };
  } catch (error) {
    logger.error({
      message: "persistInspectionDetectionEvent failed",
      error,
      input,
    });
    return { ok: false as const, error: "Falha ao persistir detecção" };
  }
}

