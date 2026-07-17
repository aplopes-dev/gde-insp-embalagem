import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/libs/auth";
import {
  APP_ROLES,
  type AppRole,
  canAccessAdmin,
  canAccessHistorico,
  hasRole,
  isAppRole,
  isAuditor,
  isOperador,
  isSupervisor,
} from "@/lib/rbac-roles";

export {
  APP_ROLES,
  type AppRole,
  canAccessAdmin,
  canAccessHistorico,
  hasRole,
  isAppRole,
  isAuditor,
  isOperador,
  isSupervisor,
};

export type RequireRoleSuccess = {
  ok: true;
  role: AppRole;
  userId?: string;
  email?: string | null;
};

export type RequireRoleFailure = {
  ok: false;
  response: NextResponse;
};

/**
 * Gate de API: autentica via NextAuth e exige um dos roles permitidos.
 * Uso: `const gate = await requireRole(["AUDITOR"]); if (!gate.ok) return gate.response;`
 */
export async function requireRole(
  allowed: readonly AppRole[]
): Promise<RequireRoleSuccess | RequireRoleFailure> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  const role = (session.user as { role?: unknown }).role;
  if (!hasRole(role, allowed)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }

  const user = session.user as { id?: string; email?: string | null };
  return {
    ok: true,
    role: role as AppRole,
    userId: user.id,
    email: user.email,
  };
}
