import { DetectionDto, ActionDto, HeartbeatDto } from "@/types/dtos/socket-detection-dto";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = `${process.env.NEXT_PUBLIC_SOCKET_URL}`;

// Device_id ao qual esta instância do frontend está pareada.
// Definido por NEXT_PUBLIC_DEVICE_ID no .env de cada servidor/workstation.
const MY_DEVICE_ID = process.env.NEXT_PUBLIC_DEVICE_ID ?? '';

interface UseSocketProps {
  opId?: string;
  onDetectionUpdate?: (data: DetectionDto) => void;
  onActionHandler?: (data: ActionDto) => void;
  onHeartbeat?: (data: HeartbeatDto) => void;
}

let sharedSocket: Socket | null = null;

export function useSocketDetection({
  opId,
  onDetectionUpdate,
  onActionHandler,
  onHeartbeat,
}: UseSocketProps) {
  const opIdRef = useRef(opId);
  useEffect(() => { opIdRef.current = opId; }, [opId]);

  useEffect(() => {
    if (!sharedSocket) {
      sharedSocket = io(SOCKET_URL);
    }
    const socket = sharedSocket;

    const handleConnect = () => {
      // Entra na room desta OP — 1ª camada: separa OPs diferentes
      if (opIdRef.current) socket.emit("joinOp", { op_id: opIdRef.current });
    };

    const handleDetection = (data: DetectionDto) => {
      // 2ª camada: dentro da mesma OP, aceita só eventos do óculos pareado.
      // Garante que 2 operadores na mesma OP não validem análise um do outro.
      if (MY_DEVICE_ID && data.device_id !== MY_DEVICE_ID) return;
      onDetectionUpdate?.(data);
    };

    socket.on("connect", handleConnect);
    if (socket.connected && opIdRef.current) {
      socket.emit("joinOp", { op_id: opIdRef.current });
    }

    socket.on("detectionUpdate", handleDetection);
    if (onActionHandler) socket.on("actionHandler", onActionHandler);
    if (onHeartbeat)     socket.on("heartbeat", onHeartbeat);

    return () => {
      if (opIdRef.current) socket.emit("leaveOp", { op_id: opIdRef.current });
      socket.off("connect", handleConnect);
      socket.off("detectionUpdate", handleDetection);
      if (onActionHandler) socket.off("actionHandler", onActionHandler);
      if (onHeartbeat)     socket.off("heartbeat", onHeartbeat);
    };
  }, []);

  return { socket: sharedSocket };
}
