export type DetectionDto = {
  itemId: string;
  count: number;
  code?: string;
  device_id?: string;
  server_id?: string;
  worker_id?: string;
  message_id?: string;
  schema_version?: number;
  event_type?: string;
  timestamp?: string;
};

export type ActionDto = {
  action: "BREAK_OP";
  params?: any;
  device_id?: string;
  server_id?: string;
  worker_id?: string;
  message_id?: string;
  schema_version?: number;
  event_type?: string;
  timestamp?: string;
};
