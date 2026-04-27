import { getSocket } from "@/libs/socket";

export function useSocketEmmiter() {
  const sendSocketEvent = (eventName: string, data: unknown) => {
    getSocket().emit(eventName, data);
  };

  return { socket: getSocket(), sendSocketEvent };
}
