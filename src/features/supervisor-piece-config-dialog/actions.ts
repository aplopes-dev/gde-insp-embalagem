"use server";

import { managarAuthorization } from "@/features/manager-auth-form-dialog/actions";
import { updateBlisterTypeParams } from "@/app/op/[opId]/actions";

export type SaveSupervisorPieceConfigInput = {
  blisterTypeId: number;
  slots: number;
  limitPerBox: number;
  managerCode: string;
  managerPassword: string;
};

export async function saveSupervisorPieceConfig(input: SaveSupervisorPieceConfigInput) {
  const { blisterTypeId, slots, limitPerBox, managerCode, managerPassword } = input;

  // Authorize manager (mocked like break dialog)
  const managerId = await managarAuthorization(managerCode, managerPassword);

  if (!managerId) {
    throw new Error("Autorização negada");
  }

  // Persist parameters to BlisterType
  await updateBlisterTypeParams(Number(blisterTypeId), Number(slots), Number(limitPerBox));

  return { ok: true, managerId };
}

