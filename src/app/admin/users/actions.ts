"use server";

// Ações de servidor para gestão de usuários (somente exclusão)
// Removido: cadastro/edição. Agora Admin pode apenas excluir usuários.

import db from "@/providers/database";
import { revalidatePath } from "next/cache";
import { requireAdminAndGetActor } from "@/shared/auth/actor";
import { logAction } from "@/shared/services/audit";
import { redirect } from "next/navigation";

function redirectWithError(path: string, e: unknown) {
  const msg = e instanceof Error ? e.message : "Erro inesperado.";
  const safe = encodeURIComponent(msg.substring(0, 200));
  redirect(`${path}?error=${safe}`);
}

export async function deleteUserAction(formData: FormData) {
  const { actorUserId } = await requireAdminAndGetActor();
  try {
    const userId = Number(formData.get("userId"));
    if (!userId || Number.isNaN(userId)) throw new Error("ID de usuário inválido.");

    if (actorUserId && userId === actorUserId) {
      throw new Error("Você não pode excluir a si mesmo.");
    }

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, inscription: true, role: true },
    });
    if (!target) throw new Error("Usuário não encontrado.");

    // Tenta excluir o usuário; relações com onDelete: Cascade (Account/Session) serão removidas automaticamente.
    await db.user.delete({ where: { id: userId } });

    await logAction({
      userId: actorUserId,
      action: "DELETE_USER",
      entity: "User",
      entityId: String(userId),
      before: { username: target.username, inscription: target.inscription, role: target.role },
      after: {},
    });

    revalidatePath("/admin/users");
    redirect("/admin/users?ok=1&msg=usuario_excluido");
  } catch (e) {
    redirectWithError("/admin/users", e);
  }
}
