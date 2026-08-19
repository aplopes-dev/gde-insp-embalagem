import { DetectionDto, ActionDto, HeartbeatDto } from "@/types/dtos/socket-detection-dto";
import { useEffect, useRef } from "react";
import { getSocket } from "@/libs/socket";

interface UseSocketProps {
  deviceId?: string;
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
  const myDeviceId = deviceIdProp?.trim() ?? "";

  const myOpId = opId?.trim() ?? "";

  const detectionRef = useRef(onDetectionUpdate);
  const actionRef = useRef(onActionHandler);
  const heartbeatRef = useRef(onHeartbeat);
  const opIdRef = useRef(myOpId);

  useEffect(() => { detectionRef.current = onDetectionUpdate; }, [onDetectionUpdate]);
  useEffect(() => { actionRef.current    = onActionHandler;   }, [onActionHandler]);
  useEffect(() => { heartbeatRef.current = onHeartbeat;       }, [onHeartbeat]);
  useEffect(() => { opIdRef.current = myOpId; }, [myOpId]);

  useEffect(() => {
    const socket = getSocket();
    const deviceId = myDeviceId;
    const filterOpId = myOpId;

    const handleConnect = () => {
      if (deviceId) {
        socket.emit("joinDevice", { device_id: deviceId });
      }
      if (filterOpId) {
        socket.emit("joinOp", { op_id: filterOpId });
      }
    };

    const handleDetection = (data: DetectionDto) => {
      if (deviceId && data.device_id !== deviceId) return;
      // Ignora resultados de outra OP no mesmo óculos (evita "MODELO DE BLISTER INVÁLIDO").
      const currentOpId = opIdRef.current;
      if (
        currentOpId &&
        data.op_id != null &&
        String(data.op_id).trim() !== "" &&
        String(data.op_id).trim() !== currentOpId
      ) {
        return;
      }
      detectionRef.current?.(data);
    };

    const handleAction = (data: ActionDto) => actionRef.current?.(data);
    const handleHeartbeat = (data: HeartbeatDto) => heartbeatRef.current?.(data);

    socket.on("connect", handleConnect);
    socket.on("detectionUpdate", handleDetection);
    socket.on("actionHandler", handleAction);
    socket.on("heartbeat", handleHeartbeat);

    if (socket.connected) {
      if (deviceId) socket.emit("joinDevice", { device_id: deviceId });
      if (filterOpId) socket.emit("joinOp", { op_id: filterOpId });
    }

    return () => {
      if (deviceId) socket.emit("leaveDevice", { device_id: deviceId });
      if (filterOpId) socket.emit("leaveOp", { op_id: filterOpId });
      socket.off("connect", handleConnect);
      socket.off("detectionUpdate", handleDetection);
      socket.off("actionHandler", handleAction);
      socket.off("heartbeat", handleHeartbeat);
    };
  }, [myDeviceId, myOpId]);

  return { socket: getSocket() };
}
