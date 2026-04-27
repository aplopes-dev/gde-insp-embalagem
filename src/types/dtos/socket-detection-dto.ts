export type DetectionDto = {
  itemId: string;
  count: number;
  code?: string;
  opId?: number | string;
};

export type ActionDto = {
  action: "BREAK_OP";
  params: any;
  opId?: number | string;
};
