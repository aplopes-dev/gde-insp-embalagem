import { generateBarcode } from "@/shared/services/jerp";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";


type GenerateBarcodeBody = {
  opId: number
  boxId: number
  quantity: number
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    console.log("[Barcode API] Sessão:", session ? "existe" : "não existe");
    console.log("[Barcode API] User:", session?.user);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    console.log("[Barcode API] UserId extraído:", userId);

    if (!userId) {
      console.error("[Barcode API] UserId não encontrado na sessão. Session.user completo:", JSON.stringify(session.user, null, 2));
      return NextResponse.json(
        { error: "ID do usuário não encontrado na sessão" },
        { status: 400 }
      );
    }

    const { opId, boxId, quantity } = await req.json() as GenerateBarcodeBody;
    console.log("[Barcode API] Dados recebidos:", { opId, boxId, quantity, userId });
    const tagDataReq = await generateBarcode(opId, `${boxId}`, quantity, userId);

    if (tagDataReq.isRight()) {
      return NextResponse.json(tagDataReq.get());
    } else {
      const data = tagDataReq.getLeft()
      return NextResponse.json(data, { status: data.status });
    }
  } catch (error) {
    console.error("Erro ao gerar código de barras:", error);
    return NextResponse.json(
      { error: "Erro ao gerar código de barras" },
      { status: 500 }
    );
  }
}
