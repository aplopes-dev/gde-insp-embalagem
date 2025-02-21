import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = `${process.env.NEXT_PUBLIC_SOCKET_URL}`;

let socket: Socket | null = null;

export function useSocketEmmiter() {

  useEffect(() => {
    if (!socket) {
      socket = io(SOCKET_URL);
    }
  }, []);

  const sendSocketEvent = (eventName: string, data: any) => {
    if (!socket) throw new Error("Socket não iniciado!");
    socket.emit(eventName, data);
  };

  return { socket, sendSocketEvent };
}
