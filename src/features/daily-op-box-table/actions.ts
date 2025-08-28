"use server";

import db from "@/providers/database";
import { generateBarcode } from "@/shared/services/jerp";
import { ApiResponseError } from "@/shared/utils/errorHandler";
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


export async function generateBarcodeByBoxId(opId: number, boxId: number): Promise<PrintTagJerpDto | ApiResponseError> {
  const box = await db.opBox.findUnique({
    where: {
      id: `${boxId}`,
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

  if (!box) return {
    status: 400,
    error: "Falha ao gerar etiqueta",
    errorData: {
      message: "Caixa não pode ser finalizada! Verifique se há pendências.",
    },
  } as ApiResponseError;

  // Guarda mínima: não chamar JERP se a etiqueta já foi gerada
  if (box.barCode || box.barCodeGeneratedAt) {
    return {
      status: 409,
      error: "Etiqueta já gerada",
      errorData: { message: "Etiqueta já foi gerada para esta caixa." },
    } as ApiResponseError;
  }

  const quantity = box.OpBoxBlister.reduce((acc, i) => acc + i.quantity, 0);
  const tagDataReq = await generateBarcode(opId, `${boxId}`, quantity);

  if (tagDataReq.isRight()) {
    return tagDataReq.get()
  } else {
    return tagDataReq.getLeft()
  }
}


// Claim atômico da próxima caixa pendente (usa updateMany como trava otimista)
export async function claimNextPendingBox(opId: number, instanceId?: string): Promise<{ id: string } | ApiResponseError> {
  // Resolve instanceId no lado do servidor (evita ler process.env no client)
  const iid = instanceId || process.env.NEXT_PUBLIC_INSTANCE_ID || process.env.INSTANCE_ID || null;

  // Busca a primeira pendente por ordem de code
  const next = await db.opBox.findFirst({
    where: {
      opId,
      packedAt: null,
      OR: [
        { claimedByInstanceId: null },
        { claimedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } }, // expiração de 10 min
      ],
    },
    orderBy: { code: "asc" },
    select: { id: true },
  });

  if (!next) return { status: 404, error: "Sem caixas pendentes", errorData: { message: "Nenhuma caixa pendente disponível." } } as ApiResponseError;

  // Tenta reservar de forma otimista
  const updated = await db.opBox.updateMany({
    data: { claimedByInstanceId: iid ?? undefined, claimedAt: new Date() },
    where: {
      id: next.id,
      packedAt: null,
      OR: [
        { claimedByInstanceId: null },
        { claimedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } },
      ],
    },
  });

  if (updated.count === 0) {
    return { status: 409, error: "Conflito de claim", errorData: { message: "Outra estação pegou esta caixa. Tente novamente." } } as ApiResponseError;
  }

  return { id: next.id };
}

// Retorna a próxima caixa pendente (sem claim/lock). Para robustez total, evoluir para claim.
export async function getNextPendingBox(opId: number): Promise<{ id: string } | null> {
  const next = await db.opBox.findFirst({
    where: { opId, packedAt: null },
    orderBy: { code: "asc" },
    select: { id: true },
  });
  return next ?? null;
}
