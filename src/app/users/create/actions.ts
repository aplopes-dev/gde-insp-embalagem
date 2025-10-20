"use server";

import db from "@/providers/database";
import { hashPass } from "@/libs/bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";

const ALLOWED_ROLES = ["ADMINISTRADOR", "SUPERVISOR", "OPERADOR"] as const;

export async function createUserAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "ADMINISTRADOR") {
    redirect("/login");
  }

  const name = (formData.get("name") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim();
  const profile = (formData.get("role") || "").toString().trim();
  const password = (formData.get("password") || "").toString();
  const confirmPassword = (formData.get("confirmPassword") || "").toString();

  const params = new URLSearchParams();

  // Validações
  if (!name || !email || !profile || !password || !confirmPassword) {
    params.set("error", "Todos os campos são obrigatórios.");
    redirect(`/users/create?${params.toString()}`);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    params.set("error", "E-mail inválido.");
    redirect(`/users/create?${params.toString()}`);
  }

  if (!ALLOWED_ROLES.includes(profile as any)) {
    params.set("error", "Perfil inválido.");
    redirect(`/users/create?${params.toString()}`);
  }

  if (password.length < 6) {
    params.set("error", "Senha deve ter no mínimo 6 caracteres.");
    redirect(`/users/create?${params.toString()}`);
  }

  const complexity = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
  if (!complexity.test(password)) {
    params.set("error", "Senha deve conter pelo menos 1 letra maiúscula, 1 número e 1 caractere especial.");
    redirect(`/users/create?${params.toString()}`);
  }

  if (password !== confirmPassword) {
    params.set("error", "As senhas não coincidem.");
    redirect(`/users/create?${params.toString()}`);
  }

  // Verifica e-mail duplicado
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    params.set("error", "E-mail já cadastrado.");
    redirect(`/users/create?${params.toString()}`);
  }

  // Cria usuário
  const hashed = await hashPass(password);
  await db.user.create({
    data: {
      name,
      email,
      password: hashed,
      // @ts-ignore - prisma enum string
      role: profile,
    },
  });

  redirect("/?created=1");
}

