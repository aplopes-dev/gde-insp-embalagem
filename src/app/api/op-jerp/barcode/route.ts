import { generateBarcode } from "@/shared/services/jerp";
import { getAuthoritativeBoxPackedSummary } from "@/usecases/op-jerp/get-authoritative-box-packed-summary";
import { buildJerpApontamentoPayload } from "@/usecases/op-jerp/build-jerp-apontamento-payload";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";
import logger from "@/libs/logger";

type GenerateBarcodeBody = {
  opId: number;
  boxId: number | string;
  // Enviado apenas para conferência/auditoria. NUNCA é usado no apontamento:
  // a quantidade oficial vem sempre do banco (blisters embalados) e do JERP.
  clientQuantity?: number;
  // Compatibilidade com clientes antigos que enviavam `quantity`.
  quantity?: number;
};

async function resolveUserId(email: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userName = (session.user as any).email;

    if (!userName) {
      return NextResponse.json(
        { error: "Nome do usuário não encontrado na sessão" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as GenerateBarcodeBody;
    const opId = Number(body.opId);
    const boxId = `${body.boxId}`;
    const clientQuantity = body.clientQuantity ?? body.quantity ?? null;

    if (!opId || !boxId) {
      return NextResponse.json(
        { error: "opId e boxId são obrigatórios" },
        { status: 400 }
      );
    }

    // 1. Quantidade e blisters: sempre a partir do banco (packedAt), nunca do cliente.
    const packedSummary = await getAuthoritativeBoxPackedSummary(boxId);

    if (!packedSummary || packedSummary.quantity <= 0) {
      return NextResponse.json(
        {
          error:
            "Nenhum blister embalado nesta caixa. A etiqueta não pode ser gerada.",
        },
        { status: 400 }
      );
    }

    const authoritativeQuantity = packedSummary.quantity;
    const apontamentoPayload = buildJerpApontamentoPayload(
      opId,
      boxId,
      packedSummary.blisters
    );

    // Conferência: a quantidade calculada no cliente diverge da persistida?
    const clientDivergence =
      clientQuantity != null && clientQuantity !== authoritativeQuantity;
    if (clientDivergence) {
      logger.warn({
        message:
          "Divergência entre quantidade do cliente e a persistida no banco (usando banco).",
        opId,
        boxId,
        clientQuantity,
        authoritativeQuantity,
      });
    }

    // 2. Apontamento no JERP usando quantidade e embalagens persistidas.
    const tagDataReq = await generateBarcode(
      opId,
      boxId,
      authoritativeQuantity,
      userName,
      packedSummary.blisters
    );

    if (!tagDataReq.isRight()) {
      const data = tagDataReq.getLeft();
      return NextResponse.json(data, { status: data.status });
    }

    const tag = tagDataReq.get();

    if (tag.quantidadeApontada !== authoritativeQuantity) {
      logger.error({
        message:
          "JERP retornou quantidade diferente da persistida no banco.",
        opId,
        boxId,
        authoritativeQuantity,
        quantidadeApontada: tag.quantidadeApontada,
      });
      return NextResponse.json(
        {
          error: "Divergência entre quantidade apontada no JERP e a inspecionada.",
          errorData: {
            message: `Esperado ${authoritativeQuantity} peças (banco), JERP retornou ${tag.quantidadeApontada}.`,
          },
        },
        { status: 502 }
      );
    }

    // 3. Auditoria: registra a geração da etiqueta
    //    devolvido pela integração (JERP). O `pdfBase64` fica de fora por ser o
    //    binário da etiqueta (não é informação da OP) e evitar inflar o log.
    try {
      const userId = await resolveUserId(userName);
      if (userId) {
        const divergenceNote = clientDivergence
          ? ` [ALERTA: cliente informou ${clientQuantity}, banco registrou ${authoritativeQuantity}]`
          : "";

        const { pdfBase64: _pdfBase64, ...jerpResponse } = tag;

        await db.opActivityLog.create({
          data: {
            opId,
            userId,
            actionType: "STATUS_CHANGED",
            description: `Etiqueta gerada: ${tag.quantidadeApontada} peças, código ${tag.idBarras}.${divergenceNote}`,
            boxId,
            details: {
              event: "BARCODE_GENERATED",
              authoritativeQuantity,
              clientQuantity,
              quantidadeApontada: tag.quantidadeApontada,
              idBarras: tag.idBarras,
              quantidadePendente: tag.quantidadePendente,
              embalagens: apontamentoPayload.embalagens,
              blisters: apontamentoPayload.blisters,
              jerpResponse,
            },
          },
        });
      }
    } catch (logError) {
      logger.error({
        message: "Falha ao registrar auditoria de geração de etiqueta.",
        error: logError,
      });
    }

    return NextResponse.json(tag);
  } catch (error) {
    logger.error({ message: "Erro ao gerar código de barras", error });
    return NextResponse.json(
      { error: "Erro ao gerar código de barras" },
      { status: 500 }
    );
  }
}
