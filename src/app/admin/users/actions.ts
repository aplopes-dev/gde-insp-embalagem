"use server";

// Ações de servidor para CRUD de usuários (Admin)
// Simples, funcional, com validações e auditoria. Tudo em PT-BR.

import db from "@/providers/database";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { validatePasswordPolicy } from "@/shared/utils/password-policy";
import { requireAdminAndGetActor } from "@/shared/auth/actor";
import { logAction } from "@/shared/services/audit";
import { redirect } from "next/navigation";
import { z } from "zod";


function redirectWithError(path: string, e: unknown) {
  const msg = e instanceof Error ? e.message : "Erro inesperado.";
  // Evitar caracteres perigosos na URL
  const safe = encodeURIComponent(msg.substring(0, 200));
  redirect(`${path}?error=${safe}`);
}


const passwordSchema = z
  .string()
  .min(8, "A senha deve ter no mínimo 8 caracteres.")
  .regex(/[A-Z]/, "A senha deve conter ao menos 1 letra maiúscula.")
  .regex(/[a-z]/, "A senha deve conter ao menos 1 letra minúscula.")
  .regex(/[0-9]/, "A senha deve conter ao menos 1 número.")
  .regex(/[!@#$%^&*(),.?":{}|<>_\-\[\]\/+=~`]/, "A senha deve conter ao menos 1 caractere especial.");

const CreateUserSchema = z.object({
  username: z.string().min(1, "Username é obrigatório."),
  email: z.string().email("E-mail inválido."),
  password: passwordSchema,
  role: z.enum(["OPERATOR", "SUPERVISOR", "ADMIN"] as const, {
    invalid_type_error: "Role inválida.",
    required_error: "Role inválida.",
  }),
});

const ROLES = ["OPERATOR", "SUPERVISOR", "ADMIN"] as const;

export async function createUserAction(formData: FormData) {
  const { actorUserId } = await requireAdminAndGetActor();
  const username = String(formData.get("username") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "OPERATOR");

  const parsed = CreateUserSchema.safeParse({ username, email, password, role });
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message || "Dados inválidos.";
    throw new Error(msg);
  }
  // Validação adicional (compatível com regras anteriores)
  const policy = validatePasswordPolicy(password);
  if (!policy.ok) {
    throw new Error(policy.message || "Senha inválida.");
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: { username, email, password: hash, role: role as any },
  });

  await logAction({
    userId: actorUserId,
    action: "CREATE_USER",
    entity: "User",
    entityId: String(user.id),
    before: {},
    after: { id: user.id, username, email, role },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=1&msg=usuario_criado");
}

export async function updateUserRoleAction(formData: FormData) {
  const { actorUserId } = await requireAdminAndGetActor();
  try {
    const userId = Number(formData.get("userId"));
    const role = String(formData.get("role") || "");
    if (!userId || !ROLES.includes(role as any)) throw new Error("Dados inválidos.");

    // Restrições solicitadas:
    // - Admin não pode alterar a própria role
    if (actorUserId && userId === actorUserId) {
      throw new Error("Você não pode alterar a sua própria role.");
    }

    // - Admin não pode alterar a role de outro administrador
    const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) throw new Error("Usuário não encontrado.");
    if (String(target.role) === "ADMIN") {
      throw new Error("Não é permitido alterar a role de um administrador.");
    }

    const before = { role: target.role } as any;
    const updated = await db.user.update({ where: { id: userId }, data: { role: role as any } });

    await logAction({
      userId: actorUserId,
      action: "UPDATE_USER_ROLE",
      entity: "User",
      entityId: String(userId),
      before,
      after: { role: updated.role },
    });

    revalidatePath("/admin/users");
    redirect("/admin/users?ok=1&msg=perfil_atualizado");
  } catch (e) {
    redirectWithError("/admin/users", e);
  }
}

export async function resetUserPasswordAction(formData: FormData) {
  const { actorUserId } = await requireAdminAndGetActor();
  const userId = Number(formData.get("userId"));
  const password = String(formData.get("password") || "");
  const ResetSchema = z.object({
    userId: z.number().int().positive("ID inválido."),
    password: passwordSchema,
  });
  const parsed = ResetSchema.safeParse({ userId, password });
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message || "Dados inválidos.";
    throw new Error(msg);
  }
  // Validação adicional (compatível com regras anteriores)
  const policy = validatePasswordPolicy(password);
  if (!policy.ok) throw new Error(policy.message || "Senha inválida.");

  const hash = await bcrypt.hash(password, 10);
  const before = { password: "<hidden>" };
  const updated = await db.user.update({ where: { id: userId }, data: { password: hash } });

  await logAction({
    userId: actorUserId,
    action: "RESET_USER_PASSWORD",
    entity: "User",
    entityId: String(userId),
    before,
    after: { password: "<hidden>" },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=1&msg=senha_resetada");
}

