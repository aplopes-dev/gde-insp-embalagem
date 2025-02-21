export type DetectionDto = {
  itemId: string;
  count: number;
  code?: string;
};

export type ActionDto = {
  action: "BREAK_OP";
  params: any;
};
