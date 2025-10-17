"use server"

import { isSamePass } from "@/libs/bcrypt";
import db from "@/providers/database";

export async function managarAuthorization(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("CADASTRO INVALIDO.");
  }
  const ok = await isSamePass(password, user.password);
  if (!ok) {
    throw new Error("CADASTRO INVALIDO.");
  }
  if (user.role !== "ADMINISTRADOR" && user.role !== "SUPERVISOR") {
    throw new Error("CADASTRO INVALIDO.");
  }
  return user.id;
}