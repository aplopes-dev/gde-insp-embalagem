import { DetectionDto, ActionDto, HeartbeatDto } from "@/types/dtos/socket-detection-dto";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = `${process.env.NEXT_PUBLIC_SOCKET_URL}`;

interface UseSocketProps {
  opId?: string;
  onDetectionUpdate?: (data: DetectionDto) => void;
  onActionHandler?: (data: ActionDto) => void;
  onHeartbeat?: (data: HeartbeatDto) => void;
}

export function useSocketDetection({
  opId,
  onDetectionUpdate,
  onActionHandler,
  onHeartbeat,
}: UseSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const opIdRef = useRef(opId);

  useEffect(() => {
    opIdRef.current = opId;
  }, [opId]);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      // Entra na room da OP para receber apenas detecções desta OP
      if (opIdRef.current) {
        newSocket.emit("joinOp", { op_id: opIdRef.current });
      }
    });

    if (onDetectionUpdate) newSocket.on("detectionUpdate", onDetectionUpdate);
    if (onActionHandler) newSocket.on("actionHandler", onActionHandler);
    if (onHeartbeat) newSocket.on("heartbeat", onHeartbeat);

    return () => {
      if (opIdRef.current) {
        newSocket.emit("leaveOp", { op_id: opIdRef.current });
      }
      newSocket.off("detectionUpdate", onDetectionUpdate);
      newSocket.off("actionHandler", onActionHandler);
      newSocket.off("heartbeat", onHeartbeat);
      newSocket.disconnect();
    };
  }, []);

  return { socket };
}
