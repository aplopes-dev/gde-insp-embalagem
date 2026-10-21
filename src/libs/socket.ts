import { io, Socket } from "socket.io-client";

let _socket: Socket | null = null;

const SOCKET_OVERRIDE_KEY = "gde.socketUrl";

function sessionStore(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/**
 * `?ws=http://IP:porta` liga este separador a uma ponte WebSocket local (Server 02:
 * o resultado do worker chega à tela sem passar pela Wi‑Fi). Fica guardado só neste
 * separador (sessionStorage); `?ws=` vazio volta ao WebSocket da página.
 */
export function socketUrlOverride(search: string, storage: Storage | null): string | null {
  const params = new URLSearchParams(search);
  if (!params.has("ws")) {
    try {
      return storage?.getItem(SOCKET_OVERRIDE_KEY) ?? null;
    } catch {
      return null;
    }
  }
  const raw = (params.get("ws") ?? "").trim();
  let origin: string | null = null;
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") origin = url.origin;
  } catch {
    origin = null;
  }
  try {
    if (origin) storage?.setItem(SOCKET_OVERRIDE_KEY, origin);
    else storage?.removeItem(SOCKET_OVERRIDE_KEY);
  } catch {
    // sessionStorage bloqueado: vale só para este carregamento.
  }
  return origin;
}

/**
 * Grava o `?ws=` da página atual. Chamado em todas as páginas (DeviceIdKeeper): a GUI abre a
 * página inicial e a tela de inspeção, onde o socket é criado, é outra página sem `?ws=`.
 */
export function rememberSocketUrlFromQuery(search: string): void {
  if (new URLSearchParams(search).has("ws")) socketUrlOverride(search, sessionStore());
}

/**
 * No browser, o WS tem de ser o mesmo hostname da página.
 * Um IP fixo no build (ex. 172.30.40.27) faz a inspeção nunca arrancar se o
 * operador abrir o site pelo cabo (192.168.1.2) ou se o Wi‑Fi Embalagem falhar.
 */
export function resolveSocketUrl(): string {
  const wsPort = process.env.NEXT_PUBLIC_SOCKET_PORT ?? "3012";
  if (typeof window !== "undefined") {
    const override = socketUrlOverride(window.location.search ?? "", sessionStore());
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
