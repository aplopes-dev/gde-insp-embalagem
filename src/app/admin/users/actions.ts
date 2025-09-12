"use server";

// Ações de servidor para CRUD de usuários (Admin)
// Simples, funcional, com validações e auditoria. Tudo em PT-BR.

import db from "@/providers/database";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { validatePasswordPolicy } from "@/shared/utils/password-policy";
import { requireAdmin } from "@/shared/auth/permissions";
import { logAction } from "@/shared/services/audit";

const ROLES = ["OPERATOR", "SUPERVISOR", "ADMIN"] as const;

export async function createUserAction(formData: FormData) {
  await requireAdmin();
  const username = String(formData.get("username") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "OPERATOR");

  if (!username || !email || !password) {
    throw new Error("Campos obrigatórios ausentes (username, email, senha).");
  }
  if (!ROLES.includes(role as any)) {
    throw new Error("Role inválida.");
  }

  const policy = validatePasswordPolicy(password);
  if (!policy.ok) {
    throw new Error(policy.message || "Senha inválida.");
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: { username, email, password: hash, role: role as any },
  });

  await logAction({
    userId: user.id, // criador será registrado pelo userId? Aqui registramos o criado como after, e o autor no futuro via session (requireAdmin pode evoluir)
    action: "CREATE_USER",
    entity: "User",
    entityId: String(user.id),
    before: {},
    after: { id: user.id, username, email, role },
  });

  revalidatePath("/admin/users");
}

export async function updateUserRoleAction(formData: FormData) {
  await requireAdmin();
  const userId = Number(formData.get("userId"));
  const role = String(formData.get("role") || "");
  if (!userId || !ROLES.includes(role as any)) throw new Error("Dados inválidos.");

  const before = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  const updated = await db.user.update({ where: { id: userId }, data: { role: role as any } });

  await logAction({
    userId: updated.id,
    action: "UPDATE_USER_ROLE",
    entity: "User",
    entityId: String(userId),
    before,
    after: { role: updated.role },
  });

  revalidatePath("/admin/users");
}

export async function resetUserPasswordAction(formData: FormData) {
  await requireAdmin();
  const userId = Number(formData.get("userId"));
  const password = String(formData.get("password") || "");
  if (!userId || !password) throw new Error("Dados inválidos.");

  const policy = validatePasswordPolicy(password);
  if (!policy.ok) throw new Error(policy.message || "Senha inválida.");

  const hash = await bcrypt.hash(password, 10);
  const before = { password: "<hidden>" };
  const updated = await db.user.update({ where: { id: userId }, data: { password: hash } });

  await logAction({
    userId: updated.id,
    action: "RESET_USER_PASSWORD",
    entity: "User",
    entityId: String(userId),
    before,
    after: { password: "<hidden>" },
  });

  revalidatePath("/admin/users");
}

