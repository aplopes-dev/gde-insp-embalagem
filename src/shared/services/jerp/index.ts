"use server"

import { saveTagId } from "@/app/op/[opId]/actions";
import logger from "@/libs/logger";
import { ApiResponseError, handleApiResponseError } from "@/shared/utils/errorHandler";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { PrintTagJerpDto } from "@/types/dtos/print-tag-jerp-dto";
import axios from "axios";
import { Either, makeLeft, makeRight } from '@/shared/utils/either';

function readJerpEnv(): { api: string; token: string } | undefined {
  const api = process.env.JERP_API;
  const token = process.env.JERP_TOKEN;
  if (!api || !token) return undefined;
  return { api, token };
}

function missingJerpEnvError(): ApiResponseError {
  const message =
    "As variáveis de ambiente JERP_API e JERP_TOKEN são obrigatórias.";
  logger.error({ message });
  return { status: 503, error: message };
}

export async function getOpFromCode(code: string): Promise<Either<ApiResponseError, OpJerpDto>> {
  const env = readJerpEnv();
  if (!env) return makeLeft(missingJerpEnvError());
  try {
    const response = await axios.get(`${env.api}/ordemproducao/${code}`, {
      headers: getJerpHeaders(env.token),
    });
    return makeRight(response.data);
  } catch (error) {
    return makeLeft(handleApiResponseError(error, `Falha ao obter OP para o código: ${code}`))
  }
}

export async function getOpFromId(id: string): Promise<Either<ApiResponseError, OpJerpDto>> {
  const env = readJerpEnv();
  if (!env) return makeLeft(missingJerpEnvError());
  try {
    const response = await axios.get(`${env.api}/ordemproducaoid/${id}`, {
      headers: getJerpHeaders(env.token),
    });
    return makeRight(response.data);
  } catch (error) {
    return makeLeft(handleApiResponseError(error, `Falha ao obter OP para o id: ${id}`));
  }
}

export async function generateBarcode(id: number, opBoxId: string, quantity: number, userName: string): Promise<Either<ApiResponseError, PrintTagJerpDto>> {
  if (!id) throw new Error("ID da OP é obrigatório para gerar etiqueta")
  if (!opBoxId) throw new Error("ID da caixa é obrigatório para gerar etiqueta")

  const env = readJerpEnv();
  if (!env) return makeLeft(missingJerpEnvError());

  try {
    const payload = { id, quantidadeApontada: quantity, userName: userName };

    const response = await axios.post(
      `${env.api}/ordemproducao`,
      payload,
      { headers: getJerpHeaders(env.token) }
    );

    await saveTagId(opBoxId, `${response.data.idBarras}`);
    return makeRight(response.data);
  } catch (error: any) {
    return makeLeft(handleApiResponseError(error, `Falha ao obter código de barras para OP: ${id}`));
  }
}

function getJerpHeaders(token: string) {
  return {
    authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
