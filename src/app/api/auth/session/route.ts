import { authOptions } from "@/libs/auth";
import { getAuthSecret } from "@/libs/auth-secret";
import type { NextApiRequest } from "next";
import { decode as decodeJwt } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { cookies, headers } from "next/headers";

function isNextAuthSessionCookieName(name: string): boolean {
  return (
    name === "next-auth.session-token" ||
    name.startsWith("next-auth.session-token.") ||
    name === "__Secure-next-auth.session-token" ||
    name.startsWith("__Secure-next-auth.session-token.")
  );
}

function clearUnreadableSessionCookies(): void {
  const jar = cookies();
  for (const { name } of jar.getAll()) {
    if (isNextAuthSessionCookieName(name)) {
      jar.delete(name);
    }
  }
}

function shouldClearSessionAfterDecodeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "JWEDecryptionFailed" || err.name === "JWTExpired";
}

/**
 * Só remove cookie de sessão quando o JWT prova ser ilegível (chave errada) ou expirado.
 * Não usar `getToken` sem raw como critério: ele engole qualquer erro e devolve `null`,
 * o que apagava cookies válidos logo após o login.
 */
async function clearStaleJwtCookieIfNeeded(): Promise<void> {
  const secret = getAuthSecret();
  if (!secret) return;

  const jar = cookies();
  const hdrs = headers();
  const req = {
    headers: Object.fromEntries(hdrs.entries()),
    cookies: Object.fromEntries(jar.getAll().map((c) => [c.name, c.value])),
  } as Pick<NextApiRequest, "headers" | "cookies"> as NextApiRequest;

  const raw = await getToken({ req, secret, raw: true });
  if (typeof raw !== "string" || !raw.length) return;

  try {
    await decodeJwt({ token: raw, secret });
  } catch (e) {
    if (shouldClearSessionAfterDecodeError(e)) {
      clearUnreadableSessionCookies();
    }
  }
}

export async function GET() {
  await clearStaleJwtCookieIfNeeded();

  const session = await getServerSession(authOptions);
  /** Formato esperado por `next-auth/react` (fetchData em `session`) — corpo = sessão, não `{ session }`. */
  return Response.json(session ?? {});
}
