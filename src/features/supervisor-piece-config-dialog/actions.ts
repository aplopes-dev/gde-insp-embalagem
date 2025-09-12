"use server";

import { managarAuthorization } from "@/features/manager-auth-form-dialog/actions";
import { updateBlisterTypeParams, createOpAfterSupervisorConfig } from "@/app/op/[opId]/actions";
import { assertUserHasPermission } from "@/shared/auth/permissions-db";

export type SaveSupervisorPieceConfigInput = {
  blisterTypeId?: number;
  externalOpId?: number;
  slots: number;
  limitPerBox: number;
  username: string;
  password: string;
};

export async function saveSupervisorPieceConfig(input: SaveSupervisorPieceConfigInput) {
  const { blisterTypeId, externalOpId, slots, limitPerBox, username, password } = input;

  // Autoriza supervisor (User.role = SUPERVISOR)
  const supervisorUserId = await managarAuthorization(username, password);

  if (!supervisorUserId) {
    throw new Error("Autorização negada");
  }

  // Checa permissão de catálogo (SUPERVISOR ou conforme matriz RBAC)
  await assertUserHasPermission(Number(supervisorUserId), "CAN_EDIT_CATALOG");

  if (blisterTypeId) {
    await updateBlisterTypeParams(Number(blisterTypeId), Number(slots), Number(limitPerBox));
    return { ok: true, supervisorUserId };
  }

  if (externalOpId) {
    // Criação do BlisterType e da OP após confirmação do supervisor
    await createOpAfterSupervisorConfig(Number(externalOpId), Number(slots), Number(limitPerBox), supervisorUserId);
    return { ok: true, supervisorUserId };
  }

  throw new Error("Parâmetros inválidos: informe blisterTypeId ou externalOpId");
}

