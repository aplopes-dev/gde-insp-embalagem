import { DetectionDto, ActionDto, HeartbeatDto } from "@/types/dtos/socket-detection-dto";
import { useEffect, useRef } from "react";
import { getSocket } from "@/libs/socket";

// Device_id ao qual esta instância do frontend está pareada.
// Definido por NEXT_PUBLIC_DEVICE_ID no .env de cada servidor/workstation.
const MY_DEVICE_ID = process.env.NEXT_PUBLIC_DEVICE_ID ?? '';

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
  const opIdRef       = useRef(opId);
  const detectionRef  = useRef(onDetectionUpdate);
  const actionRef     = useRef(onActionHandler);
  const heartbeatRef  = useRef(onHeartbeat);

  useEffect(() => { opIdRef.current      = opId;             }, [opId]);
  useEffect(() => { detectionRef.current = onDetectionUpdate; }, [onDetectionUpdate]);
  useEffect(() => { actionRef.current    = onActionHandler;   }, [onActionHandler]);
  useEffect(() => { heartbeatRef.current = onHeartbeat;       }, [onHeartbeat]);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      // Entra na room desta OP — 1ª camada: separa OPs diferentes
      if (opIdRef.current) socket.emit("joinOp", { op_id: opIdRef.current });
    };

    const handleDetection = (data: DetectionDto) => {
      // 2ª camada: dentro da mesma OP, aceita só eventos do óculos pareado.
      // Garante que 2 operadores na mesma OP não validem análise um do outro.
      if (MY_DEVICE_ID && data.device_id !== MY_DEVICE_ID) return;
      detectionRef.current?.(data);
    };

    const handleAction    = (data: ActionDto)    => actionRef.current?.(data);
    const handleHeartbeat = (data: HeartbeatDto) => heartbeatRef.current?.(data);

    socket.on("connect", handleConnect);
    if (socket.connected && opIdRef.current) {
      socket.emit("joinOp", { op_id: opIdRef.current });
    }

    socket.on("detectionUpdate", handleDetection);
    socket.on("actionHandler", handleAction);
    socket.on("heartbeat", handleHeartbeat);

    return () => {
      if (opIdRef.current) socket.emit("leaveOp", { op_id: opIdRef.current });
      socket.off("connect", handleConnect);
      socket.off("detectionUpdate", handleDetection);
      socket.off("actionHandler", handleAction);
      socket.off("heartbeat", handleHeartbeat);
    };
  }, []);

  return { socket: getSocket() };
}
