// Helpers para obter o usuário atual e garantir ADMIN, retornando o ator (para auditoria)
// Comentários em PT-BR, simples e objetivos

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const id = session?.user ? Number((session.user as any).id) : null;
  return { id, role };
}

export async function requireAdminAndGetActor(): Promise<{ actorUserId: number | undefined }> {
  const { id, role } = await getCurrentUser();
  if (role !== "ADMIN") throw new Error("Acesso negado: requer ADMIN");
  return { actorUserId: id ?? undefined };
}

