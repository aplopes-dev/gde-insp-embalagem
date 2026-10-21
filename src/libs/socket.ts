import { io, Socket } from "socket.io-client";
import {
  SOCKET_URL_COOKIE,
  SOCKET_URL_MAX_AGE_SEC,
  parseSocketOrigin,
} from "@/shared/utils/socket-url";

let _socket: Socket | null = null;

export type SocketUrlStore = {
  get(): string | null;
  set(origin: string): void;
  clear(): void;
};

/**
 * Cookie do browser: vale para todas as abas, sobrevive a F5 e ao login. O middleware
 * grava-o no primeiro pedido com `?ws=` (a página do login já não traz o parâmetro).
 */
export const cookieSocketUrlStore: SocketUrlStore = {
  get() {
    if (typeof document === "undefined") return null;
    const row = document.cookie
      .split("; ")
      .find((r) => r.startsWith(`${SOCKET_URL_COOKIE}=`));
    if (!row) return null;
    try {
      return parseSocketOrigin(decodeURIComponent(row.slice(SOCKET_URL_COOKIE.length + 1)));
    } catch {
      return null;
    }
  },
  set(origin) {
    if (typeof document === "undefined") return;
    document.cookie = `${SOCKET_URL_COOKIE}=${encodeURIComponent(origin)}; path=/; max-age=${SOCKET_URL_MAX_AGE_SEC}; samesite=lax`;
  },
  clear() {
    if (typeof document === "undefined") return;
    document.cookie = `${SOCKET_URL_COOKIE}=; path=/; max-age=0; samesite=lax`;
  },
};

/**
 * `?ws=http://IP:porta` liga este browser a uma ponte WebSocket local (Server 02: o
 * resultado do worker chega à tela sem passar pela Wi‑Fi). `?ws=` vazio volta ao
 * WebSocket da página. Sem o parâmetro, usa o valor guardado.
 */
export function socketUrlOverride(
  search: string,
  store: SocketUrlStore = cookieSocketUrlStore
): string | null {
  const params = new URLSearchParams(search);
  if (!params.has("ws")) return store.get();
  const origin = parseSocketOrigin(params.get("ws"));
  if (origin) store.set(origin);
  else store.clear();
  return origin;
}

/** Grava o `?ws=` da página atual (DeviceIdKeeper, em todas as páginas). */
export function rememberSocketUrlFromQuery(search: string): void {
  if (new URLSearchParams(search).has("ws")) socketUrlOverride(search);
}

/**
 * No browser, o WS tem de ser o mesmo hostname da página.
 * Um IP fixo no build (ex. 172.30.40.27) faz a inspeção nunca arrancar se o
 * operador abrir o site pelo cabo (192.168.1.2) ou se o Wi‑Fi Embalagem falhar.
 */
export function resolveSocketUrl(): string {
  const wsPort = process.env.NEXT_PUBLIC_SOCKET_PORT ?? "3012";
  if (typeof window !== "undefined") {
    const override = socketUrlOverride(window.location.search ?? "");
    if (override) return override;
    return `${window.location.protocol}//${window.location.hostname}:${wsPort}`;
  }
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";
  return configured || `http://localhost:${wsPort}`;
}

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(resolveSocketUrl(), {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
  }
  return _socket;
}
