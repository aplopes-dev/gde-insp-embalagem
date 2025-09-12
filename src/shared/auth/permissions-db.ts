import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/providers/database";

export type SimplePermission =
  | "CAN_MANAGE_USERS"
  | "CAN_EDIT_CATALOG"
  | "CAN_VIEW_AUDIT"
  | "CAN_CONFIGURE_PERMISSIONS";

export async function getCurrentRole() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  return role;
}

export async function hasPermission(role: string | undefined, permName: SimplePermission) {
  if (role === "ADMIN") return true;
  if (!role) return false;
  const p = await db.permission.findUnique({ where: { name: permName } });
  if (!p) return false;
  const rp = await db.rolePermission.findFirst({ where: { role: role as any, permissionId: p.id } });
  return !!rp;
}

export async function requirePermissionDb(permName: SimplePermission) {
  const role = await getCurrentRole();
  const ok = await hasPermission(role, permName);
  if (!ok) throw new Error("Acesso negado: permissão insuficiente");
  return true;
}

export async function assertUserHasPermission(userId: number, permName: SimplePermission) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) throw new Error("Usuário não encontrado");
  const ok = await hasPermission(user.role, permName);
  if (!ok) throw new Error("Acesso negado: permissão insuficiente");
  return true;
}

