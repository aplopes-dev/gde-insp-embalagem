export const APP_ROLES = ["SUPERVISOR", "OPERADOR", "AUDITOR"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return (
    value === "SUPERVISOR" || value === "OPERADOR" || value === "AUDITOR"
  );
}

export function hasRole(userRole: unknown, allowed: readonly AppRole[]): boolean {
  return isAppRole(userRole) && allowed.includes(userRole);
}

export function isSupervisor(role: unknown): boolean {
  return role === "SUPERVISOR";
}

export function isAuditor(role: unknown): boolean {
  return role === "AUDITOR";
}

export function isOperador(role: unknown): boolean {
  return role === "OPERADOR";
}

/** Histórico de ocorrências: exclusivo do AUDITOR. */
export function canAccessHistorico(role: unknown): boolean {
  return isAuditor(role);
}

/** Painel Admin / CRUD: exclusivo do SUPERVISOR. */
export function canAccessAdmin(role: unknown): boolean {
  return isSupervisor(role);
}
