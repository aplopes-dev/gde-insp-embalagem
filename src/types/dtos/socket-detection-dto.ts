export type DetectionStep = "box" | "blister" | "quantity" | "qr";

export type DetectionAction =
  | "START_INSPECTION"
  | "STOP_INSPECTION"
  | "DETECTION_RESULT"
  | "HEARTBEAT"
  | "DEVICE_STATUS";

export type DetectionStatus = "VALID" | "INVALID" | "TIMEOUT" | "ERROR";

export type CommandDto = {
  message_id: string;
  device_id: string;
  op_id: string;
  action: DetectionAction;
  step: DetectionStep;
  payload: {
    item_id: string;
    quantity: number;
    model: string;
    file_name?: string;
  };
  timestamp: string;
};

export type DetectionDto = {
  message_id: string;
  device_id: string;
  worker_id: string;
  server_id: string;
  op_id: string;
  action: DetectionAction;
  step: DetectionStep;
  payload: {
    item_id: string;
    status: DetectionStatus;
    count: number;
    code?: string;
    confidence?: number;
    reason?: string;
    qr_op?: string;
    expected_op?: string;
    extra?: Record<string, unknown>;
  };
  timestamp: string;
};

export type HeartbeatDto = {
  message_id: string;
  device_id: string;
  worker_id: string;
  server_id: string;
  action: "HEARTBEAT";
  payload: {
    camera_ok: boolean;
    queue_ok: boolean;
    fps: number;
    uptime_seconds: number;
  };
  timestamp: string;
};

export type ActionDto = {
  action: "BREAK_OP";
  params: any;
};
