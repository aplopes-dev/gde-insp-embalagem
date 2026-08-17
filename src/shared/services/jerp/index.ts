import { getBoxBarCode, saveTagId } from "@/app/op/[opId]/actions";
import logger from "@/libs/logger";
import { ApiResponseError, handleApiResponseError } from "@/shared/utils/errorHandler";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { PrintTagJerpDto } from "@/types/dtos/print-tag-jerp-dto";
import {
  BlisterApontamentoSource,
  buildJerpEmbalagemApontamento,
} from "@/usecases/op-jerp/build-jerp-embalagem-apontamento";
import { compareApontamentoBarcodeSets } from "@/usecases/op-jerp/compare-apontamento-barcode-sets";
import { getGeneratedBarcodeEmbalagensForBox } from "@/usecases/op-jerp/get-generated-barcode-embalagens";
import axios from "axios";
import { Either, makeLeft, makeRight } from '@/shared/utils/either';

const JERP_API = process.env.JERP_API;
const JERP_TOKEN = process.env.JERP_TOKEN;

/** Espera máxima do apontamento/etiqueta. O JERP pode ultrapassar 30s quando está lento. */
export const JERP_APONTAMENTO_TIMEOUT_MS = resolveJerpApontamentoTimeoutMs(
  process.env.JERP_APONTAMENTO_TIMEOUT_MS
);

export const JERP_TIMEOUT_OPERATOR_MESSAGE =
  "O JERP está lento e não concluiu a tempo. Confira no JERP se a etiqueta já saiu antes de gerar de novo.";

export function resolveJerpApontamentoTimeoutMs(raw?: string): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 180_000;
}

export function isJerpTimeoutError(error: any): boolean {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "");
  const responseMessage = String(error?.response?.data?.message ?? "");
  return (
    code === "ECONNABORTED" ||
    /timeout/i.test(message) ||
    /timeout/i.test(responseMessage) ||
    /Execution Timeout Expired/i.test(responseMessage)
  );
}

if (!JERP_API || !JERP_TOKEN) {
  const errorMessage = "As variáveis de ambiente JERP_API e JERP_TOKEN são obrigatórias.";
  logger.error({ message: errorMessage });
  throw new Error(errorMessage);
}

export async function getOpFromCode(code: string): Promise<Either<ApiResponseError, OpJerpDto>> {
  try {
    const response = await axios.get(`${JERP_API}/ordemproducao/${code}`, {
      headers: getJerpHeaders(),
    });
    return makeRight(response.data);
  } catch (error) {
    return makeLeft(handleApiResponseError(error, `Falha ao obter OP para o código: ${code}`))
  }
}

export async function getOpFromId(id: string): Promise<Either<ApiResponseError, OpJerpDto>> {
  try {
    const response = await axios.get(`${JERP_API}/ordemproducaoid/${id}`, {
      headers: getJerpHeaders(),
    });
    return makeRight(response.data);
  } catch (error) {
    return makeLeft(handleApiResponseError(error, `Falha ao obter OP para o id: ${id}`));
  }
}

/** Tenta JERP por id interno e, se falhar, por número da OP. */
export async function getOpFromRef(
  ref: string
): Promise<Either<ApiResponseError, OpJerpDto>> {
  const trimmed = ref.trim();
  const byId = await getOpFromId(trimmed);
  if (byId.isRight()) return byId;

  const byCode = await getOpFromCode(trimmed);
  if (byCode.isRight()) return byCode;

  return byId;
}

export async function generateBarcode(
  id: number,
  opBoxId: string,
  quantity: number,
  userName: string,
  packedBlisters: ReadonlyArray<BlisterApontamentoSource>
): Promise<Either<ApiResponseError, PrintTagJerpDto>> {
  if (!id) throw new Error("ID da OP é obrigatório para gerar etiqueta")
  if (!opBoxId) throw new Error("ID da caixa é obrigatório para gerar etiqueta")

  try {
    // Idempotência: se a caixa já tem barcode, NÃO cria novo apontamento no JERP.
    // Só reutiliza se os QRs atuais forem os mesmos do apontamento original —
    // evita divergência silenciosa (OP 80569 / lote 1851454).
    const existingBarCode = await getBoxBarCode(opBoxId);
    if (existingBarCode) {
      const originalCodes = await getGeneratedBarcodeEmbalagensForBox(opBoxId);
      if (originalCodes) {
        const currentCodes = packedBlisters.map((b) => b.code);
        const comparison = compareApontamentoBarcodeSets(originalCodes, currentCodes);
        if (!comparison.equal) {
          logger.error({
            message:
              "Reuso de etiqueta bloqueado: QRs atuais divergem do apontamento original.",
            opId: id,
            boxId: opBoxId,
            idBarras: existingBarCode,
            onlyInOriginal: comparison.onlyInOriginal,
            onlyInCurrent: comparison.onlyInCurrent,
          });
          return makeLeft({
            status: 409,
            error:
              "Divergência entre os QR codes atuais da caixa e os do apontamento original desta etiqueta.",
            errorData: {
              message:
                `A caixa já tem o lote ${existingBarCode}, mas os blisters embalados agora não são os mesmos que foram apontados no JERP. ` +
                `Não reutilize esta etiqueta. Acione o supervisor (estorno/correção). ` +
                `Originais ausentes agora: ${comparison.onlyInOriginal.join(", ") || "—"}; ` +
                `atuais não apontados: ${comparison.onlyInCurrent.join(", ") || "—"}.`,
              idBarras: existingBarCode,
              onlyInOriginal: comparison.onlyInOriginal,
              onlyInCurrent: comparison.onlyInCurrent,
            },
          });
        }
      }

      logger.info({
        message: "Etiqueta já existente — reutilizando barcode sem novo apontamento JERP",
        opId: id,
        boxId: opBoxId,
        idBarras: existingBarCode,
      });
      return makeRight({
        message: "Etiqueta já gerada para esta caixa.",
        id,
        quantidadeApontada: quantity,
        idBarras: Number(existingBarCode),
        quantidadePendente: 0,
        descricao: null,
        pdfBase64: null,
      });
    }

    const embalagens = buildJerpEmbalagemApontamento(packedBlisters);

    const payload = {
      id,
      quantidadeApontada: quantity,
      userName,
      embalagens,
    };

    logger.info({
      message: "Enviando apontamento ao JERP",
      opId: id,
      boxId: opBoxId,
      quantidadeApontada: quantity,
      embalagemCount: embalagens.length,
      embalagens,
    });

    const response = await axios.post(
      `${JERP_API}/ordemproducao`,
      payload,
      { headers: getJerpHeaders(), timeout: JERP_APONTAMENTO_TIMEOUT_MS }
    );

    const saved = await saveTagId(opBoxId, `${response.data.idBarras}`);
    if (!saved) {
      // Race: outro pedido gravou primeiro. Não devolver sucesso silencioso —
      // o apontamento deste pedido ficou órfão no JERP e precisa de estorno.
      const kept = await getBoxBarCode(opBoxId);
      logger.error({
        message:
          "Apontamento JERP órfão: caixa já tinha barcode após race de geração.",
        opId: id,
        boxId: opBoxId,
        orphanedIdBarras: response.data.idBarras,
        keptBarCode: kept,
      });
      return makeLeft({
        status: 409,
        error:
          "Corrida na geração de etiqueta: outro apontamento já gravou o lote nesta caixa.",
        errorData: {
          message:
            `A caixa já possui o lote ${kept ?? "—"}. Este pedido criou o apontamento órfão ` +
            `${response.data.idBarras} no JERP — verifique estorno manual.`,
          keptBarCode: kept,
          orphanedIdBarras: response.data.idBarras,
        },
      });
    }

    return makeRight(response.data);
  } catch (error: any) {
    if (isJerpTimeoutError(error)) {
      logger.error({
        message: "Timeout ao apontar etiqueta no JERP",
        opId: id,
        boxId: opBoxId,
        timeoutMs: JERP_APONTAMENTO_TIMEOUT_MS,
        error: error?.message,
        status: error?.response?.status,
        responseData: error?.response?.data,
      });
      return makeLeft({
        status: 504,
        error: "JERP demorou demais a responder",
        errorData: {
          message: JERP_TIMEOUT_OPERATOR_MESSAGE,
          code: "JERP_TIMEOUT",
        },
      });
    }
    return makeLeft(handleApiResponseError(error, `Falha ao obter código de barras para OP: ${id}`));
  }
}

function getJerpHeaders() {
  return {
    authorization: `Bearer ${JERP_TOKEN}`,
    "Content-Type": "application/json",
  };
}
