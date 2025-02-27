"use server"

import { saveTagId } from "@/app/op/[opId]/actions";
import logger from "@/libs/logger";
import { handleError } from "@/shared/utils/errorHandler";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { PrintTagJerpDto } from "@/types/dtos/print-tag-jerp-dto";
import axios from "axios";

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
    logger.info({ message: "OP recuperada com sucesso", code: response.data.numero });
    return response.data as OpJerpDto;
  } catch (error) {
    handleError(error, `Falha ao obter OP para o código: ${code}`);
  }
}

export async function getOpFromId(id: string): Promise<OpJerpDto | undefined> {
  try {
    const response = await axios.get(`${JERP_API}/ordemproducaoid/${id}`, {
      headers: getJerpHeaders(),
    });
    logger.info({ message: "OP recuperada com sucesso", id: response.data.id });
    return response.data as OpJerpDto;
  } catch (error) {
    handleError(error, `Falha ao obter OP para o id: ${id}`);
  }
}

export async function getBarcodeFromOpId(id: number, opBoxId: number, quantity: number): Promise<PrintTagJerpDto | undefined> {
  if(!id) throw new Error("ID da OP é obrigatório para gerar etiqueta")
  if(!opBoxId) throw new Error("ID da caixa é obrigatório para gerar etiqueta")
  try {
    const response = await axios.post(
      `${JERP_API}/ordemproducao`,
      { id, quantidadeApontada: quantity },
      { headers: getJerpHeaders() }
    );
    await saveTagId(opBoxId, response.data.idBarras)
    logger.info({ message: "Código de barras gerado e associado a caixa da OP", id, quantity, barcode: response.data.idBarras });
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
