"use server";

import { managarAuthorization } from "@/features/manager-auth-form-dialog/actions";
import { updateBlisterTypeParams, createOpAfterSupervisorConfig } from "@/app/op/[opId]/actions";

export type SaveSupervisorPieceConfigInput = {
  blisterTypeId?: number;
  externalOpId?: number;
  slots: number;
  limitPerBox: number;
  managerCode: string;
  managerPassword: string;
  selectedBlisterPackagingId?: number;
};

export async function saveSupervisorPieceConfig(input: SaveSupervisorPieceConfigInput) {
  const { blisterTypeId, externalOpId, slots, limitPerBox, managerCode, managerPassword, selectedBlisterPackagingId } = input;

  // Authorize manager (mocked like break dialog)
  const managerId = await managarAuthorization(managerCode, managerPassword);

  if (!managerId) {
    throw new Error("Autorização negada");
  }

  if (blisterTypeId) {
    // Atualização de parâmetros de um BlisterType já existente
    await updateBlisterTypeParams(Number(blisterTypeId), Number(slots), Number(limitPerBox));
    return { ok: true, managerId };
  }

  if (externalOpId) {
    // Criação do BlisterType e da OP após confirmação do supervisor
    await createOpAfterSupervisorConfig(Number(externalOpId), Number(slots), Number(limitPerBox), selectedBlisterPackagingId);
    return { ok: true, managerId };
  }

  throw new Error("Parâmetros inválidos: informe blisterTypeId ou externalOpId");
}

