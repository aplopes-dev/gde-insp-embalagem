import { io, Socket } from "socket.io-client";

let _socket: Socket | null = null;

function resolveSocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";
  // Se a URL configurada não usa localhost, usa direto (produção com IP/hostname correto no build).
  if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
    return configured;
  }
  // Fallback runtime: deriva o host do browser para funcionar em qualquer máquina da rede
  // sem precisar rebuildar a imagem a cada mudança de IP.
  if (typeof window !== "undefined") {
    const wsPort = process.env.NEXT_PUBLIC_SOCKET_PORT ?? "3012";
    return `${window.location.protocol}//${window.location.hostname}:${wsPort}`;
  }
  return configured || "http://localhost:3012";
}

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(resolveSocketUrl());
  }
  return _socket;
}
