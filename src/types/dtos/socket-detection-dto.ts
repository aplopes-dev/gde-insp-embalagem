export type DetectionDto = {
  itemId: string;
  count: number;
  code?: string;
  opId?: number | string;
  deviceId?: string;
};

export type ActionDto = {
  action: "BREAK_OP";
  params: any;
  opId?: number | string;
  deviceId?: string;
};
