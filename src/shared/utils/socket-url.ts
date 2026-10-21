/**
 * Ponte WebSocket local por browser (Server 02): a GUI do posto abre a tela com
 * `?ws=http://IP:porta`. O middleware grava este cookie logo no primeiro pedido (antes do
 * redirect para o login) e o socket lê-o em todas as abas desse browser. `?ws=` vazio apaga.
 */
export const SOCKET_URL_COOKIE = "gde_socket_url";
export const SOCKET_URL_MAX_AGE_SEC = 60 * 60 * 24 * 365;

/** Só http(s); devolve apenas a origem (sem caminho nem query). */
export function parseSocketOrigin(raw?: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}
