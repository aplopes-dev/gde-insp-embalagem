export type OpBoxInspectionDto = {
  opId: number;
  quantity: number;
  status: string;
  blisters: OpBoxBlisterInspection[];
};

export type OpBoxBlisterInspection = {
  opBoxId?: number;
  code: string;
  status: string;
  quantity: number;
  isValidItem?: boolean;
  isValidQuantity?: boolean;
};
