/**
 * Utilizadores só para testes locais/Docker quando AUTH_DEV_BYPASS=true.
 * Autenticação por bcrypt na tabela User — sem chamadas ao JERP para estes emails.
 *
 * Senha comum (seed): BypassTest123!
 */

export const DEV_BYPASS_PASSWORD_PLAINTEXT = "BypassTest123!" as const;

export const DEV_BYPASS_USER_SEEDS = [
  {
    email: "bypass.supervisor@gde.local",
    name: "Bypass Supervisor",
    role: "SUPERVISOR" as const,
  },
  {
    email: "bypass.operador@gde.local",
    name: "Bypass Operador",
    role: "OPERADOR" as const,
  },
] as const;

export const DEV_BYPASS_EMAIL_SET = new Set<string>(
  DEV_BYPASS_USER_SEEDS.map((u) => u.email)
);
