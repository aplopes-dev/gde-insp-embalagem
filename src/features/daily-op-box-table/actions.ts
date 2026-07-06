"use server";

import { getAuthoritativeBoxPackedSummary } from "@/usecases/op-jerp/get-authoritative-box-packed-summary";
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
  const userName = ( session.user as any ).email;

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
    },
  });
  
  if (!box) return {
    status: 400,
    error: "Falha ao gerar etiqueta",
    errorData: {
      message: "Caixa não pode ser finalizada! Verifique se há pendências.",
    },
  } as ApiResponseError;

  const packedSummary = await getAuthoritativeBoxPackedSummary(boxId);

  if (!packedSummary || packedSummary.quantity <= 0) {
    return {
      status: 400,
      error: "Falha ao gerar etiqueta",
      errorData: {
        message: "Nenhum blister embalado nesta caixa.",
      },
    } as ApiResponseError;
  }

  const tagDataReq = await generateBarcode(
    opId,
    `${boxId}`,
    packedSummary.quantity,
    userName,
    packedSummary.blisters
  );

  if (tagDataReq.isRight()) {
    return tagDataReq.get()
  } else {
    return tagDataReq.getLeft()
  }
}