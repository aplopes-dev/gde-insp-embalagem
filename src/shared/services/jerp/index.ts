"use server"

import { saveTagId } from "@/app/op/[opId]/actions";
import logger from "@/libs/logger";
import { ApiResponseError, handleApiResponseError } from "@/shared/utils/errorHandler";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { PrintTagJerpDto } from "@/types/dtos/print-tag-jerp-dto";
import axios from "axios";
import { Either, makeLeft, makeRight } from '@/shared/utils/either';

const JERP_API = process.env.JERP_API;
const JERP_TOKEN = process.env.JERP_TOKEN;

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

export async function generateBarcode(id: number, opBoxId: string, quantity: number, userId?: string): Promise<Either<ApiResponseError, PrintTagJerpDto>> {
  if (!id) throw new Error("ID da OP é obrigatório para gerar etiqueta")
  if (!opBoxId) throw new Error("ID da caixa é obrigatório para gerar etiqueta")

  try {
    const payload: any = { id, quantidadeApontada: quantity };
    
    // Adiciona userId ao payload se fornecido
    if (userId) {
      payload.userId = userId;
    }

    const response = await axios.post(
      `${JERP_API}/ordemproducao`,
      payload,
      { headers: getJerpHeaders() }
    );

    await saveTagId(opBoxId, `${response.data.idBarras}`);
    return makeRight(response.data);
  } catch (error: any) {
    return makeLeft(handleApiResponseError(error, `Falha ao obter código de barras para OP: ${id}`));
  }
}

function getJerpHeaders() {
  return {
    authorization: `Bearer ${JERP_TOKEN}`,
    "Content-Type": "application/json",
  };
}
