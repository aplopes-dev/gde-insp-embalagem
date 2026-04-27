import { ActionDto, DetectionDto } from "@/types/dtos/socket-detection-dto";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = `${process.env.NEXT_PUBLIC_SOCKET_URL}`;

interface UseSocketProps {
  opId?: string | number;
  onDetectionUpdate?: (data: DetectionDto) => void;
  onActionHandler?: (data: ActionDto) => void;
}

export function useSocketDetection({
  opId,
  onDetectionUpdate,
  onActionHandler,
}: UseSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    onDetectionUpdate && newSocket.on("detectionUpdate", onDetectionUpdate);
    onActionHandler && newSocket.on("actionHandler", onActionHandler);
    const subscribe = () => {
      if (opId !== undefined && opId !== null && opId !== "") {
        newSocket.emit("subscribeOp", { opId });
      }
    };

    newSocket.on("connect", subscribe);
    subscribe();

    return () => {
      newSocket.off("detectionUpdate", onDetectionUpdate);
      newSocket.off("actionHandler", onActionHandler);
      newSocket.off("connect", subscribe);
      if (opId !== undefined && opId !== null && opId !== "") {
        newSocket.emit("unsubscribeOp", { opId });
      }
      newSocket.disconnect();
    };
  }, [opId]);

  return { socket };
}
