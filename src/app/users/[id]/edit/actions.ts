"use server";

import db from "@/providers/database";
import { hashPass } from "@/libs/bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";

const ALLOWED_ROLES = ["SUPERVISOR", "OPERADOR"] as const;

export async function updateUserAction(userId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "SUPERVISOR") {
    redirect("/login");
  }

  const name = (formData.get("name") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim();
  const profile = (formData.get("role") || "").toString().trim();
  const password = (formData.get("password") || "").toString();
  const confirmPassword = (formData.get("confirmPassword") || "").toString();

  const params = new URLSearchParams();

  // Validações
  if (!name || !email || !profile) {
    params.set("error", "Nome, e-mail e perfil são obrigatórios.");
    redirect(`/users/${userId}/edit?${params.toString()}`);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    params.set("error", "E-mail inválido.");
    redirect(`/users/${userId}/edit?${params.toString()}`);
  }

  if (!ALLOWED_ROLES.includes(profile as any)) {
    params.set("error", "Perfil inválido.");
    redirect(`/users/${userId}/edit?${params.toString()}`);
  }

  // Verifica e-mail duplicado (exceto o do usuário atual)
  const existing = await db.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    params.set("error", "E-mail já cadastrado.");
    redirect(`/users/${userId}/edit?${params.toString()}`);
  }

  // Preparar dados para atualização
  const data: any = {
    name,
    email,
    role: profile,
  };

  // Se senha foi fornecida, validar e atualizar
  if (password) {
    if (password.length < 6) {
      params.set("error", "Senha deve ter no mínimo 6 caracteres.");
      redirect(`/users/${userId}/edit?${params.toString()}`);
    }

    const complexity = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
    if (!complexity.test(password)) {
      params.set("error", "Senha deve conter pelo menos 1 letra maiúscula, 1 número e 1 caractere especial.");
      redirect(`/users/${userId}/edit?${params.toString()}`);
    }

    if (password !== confirmPassword) {
      params.set("error", "As senhas não coincidem.");
      redirect(`/users/${userId}/edit?${params.toString()}`);
    }

    const hashed = await hashPass(password);
    data.password = hashed;
  }

  // Atualiza usuário
  await db.user.update({
    where: { id: userId },
    data,
  });

  redirect("/users?updated=1");
}

