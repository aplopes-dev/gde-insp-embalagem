"use server"

import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import logger from "@/utils/logger";

import opXbb from "@/mocks/op-jerp-xbb.json"

const JERP_API = process.env.JERP_API;
const JERP_TOKEN = process.env.JERP_TOKEN;

if (!JERP_API || !JERP_TOKEN) {
  const errorMessage = "As variáveis de ambiente JERP_API e JERP_TOKEN são obrigatórias.";
  logger.error({ message: errorMessage });
  throw new Error(errorMessage);
}

export async function getOpFromCode(code: string): Promise<OpJerpDto | undefined> {
  return {
    ...opXbb,
    id: Number(code)
  } as OpJerpDto
  // try {
  //   const response = await fetch(`${JERP_API}/ordemproducao/${code}`, {
  //     headers: getJerpHeaders(),
  //     cache: "no-store",
  //   });

  //   if (!response.ok) {
  //     throw new Error(`Erro ao buscar OP: ${response.status} - ${response.statusText}`);
  //   }

  //   const data = await response.json();
  //   logger.info({ message: "OP recuperada com sucesso", code });
  //   return data as OpJerpDto;
  // } catch (error) {
  //   handleError(error, `Falha ao obter OP para o código: ${code}`);
  // }

}

export async function getBarcodeFromOpId(id: number, quantity: number) {
  try {
    const response = await fetch(`${JERP_API}/ordemproducao`, {
      method: "POST",
      headers: getJerpHeaders(),
      body: JSON.stringify({ id, quantidadeApontada: quantity }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao gerar código de barras: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    logger.info({ message: "Código de barras gerado", id, quantity });
    return data;
  } catch (error) {
    handleError(error, `Falha ao obter código de barras para OP: ${id}`);
  }
}

function getJerpHeaders() {
  return {
    authorization: `Bearer ${JERP_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function handleError(error: any, message: string) {
  logger.error({
    message,
    error: error.message || error,
    stack: error.stack || "Sem stack trace",
  });
  throw new Error(message);
}
