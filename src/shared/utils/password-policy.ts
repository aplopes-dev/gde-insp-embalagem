// Política de senha simples e objetiva
// - Mínimo 8 caracteres
// - Ao menos 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial

export function validatePasswordPolicy(password: string): { ok: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { ok: false, message: "A senha deve ter no mínimo 8 caracteres." };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: "A senha deve conter ao menos 1 letra maiúscula." };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: "A senha deve conter ao menos 1 letra minúscula." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: "A senha deve conter ao menos 1 número." };
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-\[\]\\/+=~`]/.test(password)) {
    return { ok: false, message: "A senha deve conter ao menos 1 caractere especial." };
  }
  return { ok: true };
}

