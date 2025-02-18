"use server"

import axios from "axios";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import logger from "@/utils/logger";

const JERP_API = process.env.JERP_API;
const JERP_TOKEN = process.env.JERP_TOKEN;

if (!JERP_API || !JERP_TOKEN) {
  const errorMessage = "As variáveis de ambiente JERP_API e JERP_TOKEN são obrigatórias.";
  logger.error({ message: errorMessage });
  throw new Error(errorMessage);
}

export async function getOpFromCode(code: string): Promise<OpJerpDto | undefined> {
  try {
    const response = await axios.get(`${JERP_API}/ordemproducao/${code}`, {
      headers: getJerpHeaders(),
    });

    logger.info({ message: "OP recuperada com sucesso", code });
    return response.data as OpJerpDto;
  } catch (error) {
    handleError(error, `Falha ao obter OP para o código: ${code}`);
  }
}

export async function getBarcodeFromOpId(id: number, quantity: number) {
  try {
    const response = await axios.post(
      `${JERP_API}/ordemproducao`,
      { id, quantidadeApontada: quantity },
      { headers: getJerpHeaders() }
    );

    logger.info({ message: "Código de barras gerado", id, quantity });
    return response.data;
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
  // Verificando se o erro é uma resposta do axios
  if (axios.isAxiosError(error)) {
    logger.error({
      message,
      error: error.message,
      stack: error.stack || "Sem stack trace",
      response: error.response || "Sem resposta",
    });
  } else {
    logger.error({
      message,
      error: error.message || error,
      stack: error.stack || "Sem stack trace",
    });
  }
  throw new Error(message);
}
