"use server"

import { isSamePass } from "@/libs/bcrypt";
import db from "@/providers/database";
import {
  fetchUserFromJerp,
  verifyPasswordWithJerp,
  mapJerpRoleToSystemRole,
} from "@/services/jerp-auth";

/**
 * Autoriza quebra de caixa via JERP: valida email/senha e isLideranca,
 * sincroniza User local e retorna user.id para registro no OpActivityLog.
 */
export async function authorizeBreakWithJerp(
  email: string,
  password: string
): Promise<string> {
  const jerpUser = await fetchUserFromJerp(email);
  if (!jerpUser) {
    throw new Error("Usuário não encontrado no JERP.");
  }
  if (!jerpUser.isLideranca) {
    throw new Error("Apenas liderança pode autorizar a quebra.");
  }
  const passwordValid = await verifyPasswordWithJerp(email, password);
  if (!passwordValid) {
    throw new Error("Senha inválida.");
  }

  const role = mapJerpRoleToSystemRole(jerpUser.isLideranca);
  let user = await db.user.findUnique({ where: { email } });

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: jerpUser.nome,
        role,
        password: "",
      },
    });
  } else {
    user = await db.user.update({
      where: { email },
      data: {
        name: jerpUser.nome,
        role,
      },
    });
  }

  return user.id;
}

export async function managarAuthorization(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("CADASTRO INVALIDO.");
  }
  const ok = await isSamePass(password, user.password);
  if (!ok) {
    throw new Error("CADASTRO INVALIDO.");
  }
  if (user.role !== "SUPERVISOR") {
    throw new Error("CADASTRO INVALIDO.");
  }
  return user.id;
}