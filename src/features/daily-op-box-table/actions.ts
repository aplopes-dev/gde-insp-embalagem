"use server";

import db from "@/providers/database";
import { generateBarcode } from "@/shared/services/jerp";
import { ApiResponseError } from "@/shared/utils/errorHandler";
import { getOwnFilterClauses } from "@/shared/utils/filter";
import OpBoxDto from "@/types/dtos/op-box-dto";
import { PrintTagJerpDto } from "@/types/dtos/print-tag-jerp-dto";
import { FilterPaginationParams } from "@/types/filter";
import { OpBoxStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

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


export async function generateBarcodeByBoxId(opId: number, boxId: string): Promise<PrintTagJerpDto | ApiResponseError> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return {
      status: 401,
      error: "Falha ao gerar etiqueta",
      errorData: {
        message: "Usuário não autenticado",
      },
    } as ApiResponseError;
  }

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
  
  if (!box) return {
    status: 400,
    error: "Falha ao gerar etiqueta",
    errorData: {
      message: "Caixa não pode ser finalizada! Verifique se há pendências.",
    },
  } as ApiResponseError;

  // Prioriza userId do banco (operador que embalou); fallback para sessão (caixas antigas)
  const userId = box.packedByUserId ?? (session.user as any).id;

  if (!userId) {
    return {
      status: 400,
      error: "Falha ao gerar etiqueta",
      errorData: {
        message: "Usuário que embalou a caixa não identificado.",
      },
    } as ApiResponseError;
  }

  const quantity = box.OpBoxBlister.reduce((acc, i) => acc + i.quantity, 0);
  const tagDataReq = await generateBarcode(opId, `${boxId}`, quantity, userId);

  if (tagDataReq.isRight()) {
    return tagDataReq.get()
  } else {
    return tagDataReq.getLeft()
  }
}