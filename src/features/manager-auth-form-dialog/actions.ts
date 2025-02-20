"use server"

import { isSamePass } from "@/libs/bcrypt";
import prisma from "@/providers/database";

export async function managarAuthorization(code: string, password: string) {
  const manager = await prisma.manager.findUnique({
    where: {
      id: Number(code),
    },
  });
  const managerPassword = manager?.password || "";
  const confirmPass = await isSamePass(password, managerPassword);
  if (!confirmPass) {
    throw new Error("Código / Senha inválidos!");
  }
  return manager && manager.id;
}