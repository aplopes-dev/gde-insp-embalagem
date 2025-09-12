"use server";

// Ações de servidor para alternar permissões por role (RBAC).
// Simples e com auditoria.

import db from "@/providers/database";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/shared/auth/permissions";
import { logAction } from "@/shared/services/audit";

export async function toggleRolePermissionAction(formData: FormData) {
  await requireAdmin();
  const role = String(formData.get("role") || "");
  const permissionId = Number(formData.get("permissionId"));
  const enabled = String(formData.get("enabled") || "false") === "true";

  if (!role || !permissionId) throw new Error("Dados inválidos.");

  const keyId = permissionId * 10 + (role === "ADMIN" ? 1 : role === "SUPERVISOR" ? 2 : 3);

  if (enabled) {
    // cria ou mantém
    await db.rolePermission.upsert({
      where: { id: keyId },
      update: {},
      create: { id: keyId, role: role as any, permissionId },
    });
  } else {
    // remove se existir
    try {
      await db.rolePermission.delete({ where: { id: keyId } });
    } catch {}
  }

  await logAction({
    userId: null,
    action: "TOGGLE_ROLE_PERMISSION",
    entity: "RolePermission",
    entityId: `${role}:${permissionId}`,
    before: {},
    after: { enabled },
  });

  revalidatePath("/admin/permissions");
}

