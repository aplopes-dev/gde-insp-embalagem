"use server";

import { isSamePass } from "@/libs/bcrypt";
import db from "@/providers/database";
import { Role } from "@prisma/client";

// Autorização genérica por usuário (username + senha), com checagem opcional de role
export async function authorizeUser(username: string, password: string, requiredRole?: Role) {
  const user = await db.user.findUnique({ where: { username } });
  if (!user) throw new Error("Usuário/Senha inválidos!");
  // Se exigido SUPERVISOR, aceitar também ADMIN
  if (requiredRole && !(user.role === requiredRole || user.role === Role.ADMIN)) {
    throw new Error("Perfil não autorizado");
  }
  const ok = await isSamePass(password, user.password || "");
  if (!ok) throw new Error("Usuário/Senha inválidos!");
  return user.id;
}

// Legacy: manter assinatura anterior, agora interpretando 'code' como username
export async function managarAuthorization(code: string, password: string, requiredRole: Role = Role.SUPERVISOR) {
  return authorizeUser(code, password, requiredRole);
}