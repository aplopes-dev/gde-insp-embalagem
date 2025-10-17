export function isStrongPassword(password: string): boolean {
  if (!password) return false;
  const hasNumber = /[0-9]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasNumber && hasUppercase && hasSpecial;
}

export const PASSWORD_POLICY_MESSAGE = "A senha deve conter pelo menos: 1 número, 1 letra maiúscula e 1 caractere especial.";

