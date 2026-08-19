import { io, Socket } from "socket.io-client";

let _socket: Socket | null = null;

/**
 * No browser, o WS tem de ser o mesmo hostname da página.
 * Um IP fixo no build (ex. 172.30.40.27) faz a inspeção nunca arrancar se o
 * operador abrir o site pelo cabo (192.168.1.2) ou se o Wi‑Fi Embalagem falhar.
 */
export function resolveSocketUrl(): string {
  const wsPort = process.env.NEXT_PUBLIC_SOCKET_PORT ?? "3012";
  if (typeof window !== "undefined") {
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
