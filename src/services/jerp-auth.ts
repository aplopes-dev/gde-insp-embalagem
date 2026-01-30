/**
 * Serviço de autenticação integrado com JERP
 * Responsável por buscar usuários e validar senhas no JERP
 */

export interface JerpUserResponse {
  email: string;
  nome: string;
  isLideranca: boolean; // true = SUPERVISOR, false = OPERADOR
  isValid?: boolean;
}

export interface JerpAuthError {
  status: number;
  message: string;
}

const JERP_API_AUTH = process.env.JERP_API_AUTH || "";
const JERP_TOKEN = process.env.JERP_TOKEN || "";

/**
 * Busca um usuário no JERP pelo email
 * GET /users/emails/{email}
 */
export async function fetchUserFromJerp(email: string): Promise<JerpUserResponse | null> {
  // Modo Real (JERP)
  if (!JERP_API_AUTH || !JERP_TOKEN) {
    throw new Error("JERP_API ou JERP_TOKEN não configurados");
  }

  try {
    const encodedEmail = encodeURIComponent(email);
    const response = await fetch(`${JERP_API_AUTH}/users/emails/${encodedEmail}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${JERP_TOKEN}`,
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      return null; // Usuário não encontrado
    }

    if (!response.ok) {
      throw new Error(`JERP error: ${response.status} ${response.statusText}`);
    }

    const data: JerpUserResponse = await response.json();
    return data;
  } catch (error) {
    console.error("[JERP] Erro ao buscar usuário:", error);
    throw error;
  }
}

/**
 * Verifica a senha do usuário no JERP
 * POST /users/emails/{email}/verify-password
 */
export async function verifyPasswordWithJerp(
  email: string,
  password: string
): Promise<boolean> {
  // Modo Real (JERP)
  if (!JERP_API_AUTH || !JERP_TOKEN) {
    throw new Error("JERP_API ou JERP_TOKEN não configurados");
  }

  try {
    const encodedEmail = encodeURIComponent(email);
    const response = await fetch(
      `${JERP_API_AUTH}/users/emails/${encodedEmail}/verify-password`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${JERP_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ password }),
      }
    );

    // 204 No Content = senha correta
    if (response.status === 204) {
      return true;
    }

    // 401 Unauthorized = senha incorreta
    if (response.status === 401) {
      return false;
    }

    // 404 Not Found = email não existe
    if (response.status === 404) {
      throw new Error("Usuário não encontrado no JERP");
    }

    // Outros erros
    throw new Error(`JERP error: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error("[JERP] Erro ao verificar senha:", error);
    throw error;
  }
}

/**
 * Converte o campo 'lideranca' do JERP para role do sistema
 */
export function mapJerpRoleToSystemRole(isLideranca: boolean): "SUPERVISOR" | "OPERADOR" {
  return isLideranca ? "SUPERVISOR" : "OPERADOR";
}