import { generateBarcode } from "@/shared/services/jerp";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";

type GenerateBarcodeBody = {
  opId: number
  boxId: string | number
  quantity: number
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { opId, boxId, quantity } = await req.json() as GenerateBarcodeBody;

    // Busca a caixa para obter packedByUserId (operador que embalou)
    const box = await db.opBox.findUnique({
      where: {
        id: String(boxId),
        opId,
      },
      select: {
        packedByUserId: true,
      },
    });

    // Prioriza userId do banco; fallback para sessão (caixas antigas)
    const userId = box?.packedByUserId ?? (session.user as any).id;

    if (!userId) {
      return NextResponse.json(
        { error: "Usuário que embalou a caixa não identificado." },
        { status: 400 }
      );
    }

    const tagDataReq = await generateBarcode(opId, String(boxId), quantity, userId);

    if (tagDataReq.isRight()) {
      return NextResponse.json(tagDataReq.get());
    } else {
      const data = tagDataReq.getLeft()
      return NextResponse.json(data, { status: data.status });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao gerar código de barras" },
      { status: 500 }
    );
  }
}
