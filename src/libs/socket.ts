import { io, Socket } from "socket.io-client";

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}`);
  }
  return _socket;
}
