import { ActionDto, DetectionDto } from "@/types/dtos/socket-detection-dto";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = `${process.env.NEXT_PUBLIC_SOCKET_URL}`;

interface UseSocketProps {
  onDetectionUpdate?: (data: DetectionDto) => void;
  onActionHandler?: (data: ActionDto) => void;
}

export function useSocketDetection({ onDetectionUpdate, onActionHandler }: UseSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null);

  // Guardar handlers atuais em refs para evitar reconexões/rebinds
  const detectionRef = useRef<typeof onDetectionUpdate>();
  const actionRef = useRef<typeof onActionHandler>();
  useEffect(() => { detectionRef.current = onDetectionUpdate; }, [onDetectionUpdate]);
  useEffect(() => { actionRef.current = onActionHandler; }, [onActionHandler]);

  // Conectar apenas uma vez
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on("detectionUpdate", (payload: DetectionDto) => {
      detectionRef.current && detectionRef.current(payload);
    });
    newSocket.on("actionHandler", (payload: ActionDto) => {
      actionRef.current && actionRef.current(payload);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return { socket };
}