import { DetectionDto, ActionDto, HeartbeatDto } from "@/types/dtos/socket-detection-dto";
import { useEffect, useRef } from "react";
import { getSocket } from "@/libs/socket";

// Build-time default; sobreposto por deviceId passado via prop (fluxo de seleção de óculos)
const DEFAULT_DEVICE_ID = process.env.NEXT_PUBLIC_DEVICE_ID ?? "";

interface UseSocketProps {
  deviceId?: string; // override do NEXT_PUBLIC_DEVICE_ID quando vem do ?deviceId= na URL
  opId?: string;
  onDetectionUpdate?: (data: DetectionDto) => void;
  onActionHandler?: (data: ActionDto) => void;
  onHeartbeat?: (data: HeartbeatDto) => void;
}

export function useSocketDetection({
  deviceId: deviceIdProp,
  opId,
  onDetectionUpdate,
  onActionHandler,
  onHeartbeat,
}: UseSocketProps) {
  const myDeviceId = deviceIdProp || DEFAULT_DEVICE_ID;

  const opIdRef      = useRef(opId);
  const deviceIdRef  = useRef(myDeviceId);
  const detectionRef = useRef(onDetectionUpdate);
  const actionRef    = useRef(onActionHandler);
  const heartbeatRef = useRef(onHeartbeat);

  useEffect(() => { opIdRef.current      = opId;             }, [opId]);
  useEffect(() => { deviceIdRef.current  = myDeviceId;       }, [myDeviceId]);
  useEffect(() => { detectionRef.current = onDetectionUpdate; }, [onDetectionUpdate]);
  useEffect(() => { actionRef.current    = onActionHandler;   }, [onActionHandler]);
  useEffect(() => { heartbeatRef.current = onHeartbeat;       }, [onHeartbeat]);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      // Inscreve no canal deste óculos — eventos chegam via room device:{device_id}
      if (deviceIdRef.current) {
        socket.emit("joinDevice", { device_id: deviceIdRef.current });
      }
    };

    const handleDetection = (data: DetectionDto) => {
      // Defesa extra: descarta eventos de outros óculos mesmo que o room não filtre
      if (deviceIdRef.current && data.device_id !== deviceIdRef.current) return;
      detectionRef.current?.(data);
    };

    const handleAction    = (data: ActionDto)    => actionRef.current?.(data);
    const handleHeartbeat = (data: HeartbeatDto) => heartbeatRef.current?.(data);

    socket.on("connect", handleConnect);
    // Se já estava conectado quando o hook montou, inscreve imediatamente
    if (socket.connected && deviceIdRef.current) {
      socket.emit("joinDevice", { device_id: deviceIdRef.current });
    }

    socket.on("detectionUpdate", handleDetection);
    socket.on("actionHandler",   handleAction);
    socket.on("heartbeat",       handleHeartbeat);

    return () => {
      if (deviceIdRef.current) {
        socket.emit("leaveDevice", { device_id: deviceIdRef.current });
      }
      socket.off("connect",         handleConnect);
      socket.off("detectionUpdate", handleDetection);
      socket.off("actionHandler",   handleAction);
      socket.off("heartbeat",       handleHeartbeat);
    };
  }, []);

  return { socket: getSocket() };
}
