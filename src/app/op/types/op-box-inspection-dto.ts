export type OpInspectionDto = {
  opId: number;
  opCode: string;
  status: number;
  quantityToProduce: number;
  productType: ProductTypeDto;
  blisterType: BlisterTypeDto;
  boxType: BoxTypeDto;
  itemsPacked: number;
  totalBoxes: number;
  pendingBoxes: number;
  nextBox?: OpBoxInspectionDto;
  createdAt: Date;
  finishedAt?: Date;
};

export type OpBoxInspectionDto = {
  id: number;
  code: string;
  status: number;
  createdAt: Date;
  packedAt?: Date;
  OpBoxBlister?: OpBoxBlisterInspection[];
};

export type OpBoxBlisterInspection = {
  id?: number;
  quantity: number;
  status?: number;
  packedAt?: Date;
  isValidItem?: boolean;
  isValidQuantity?: boolean;
};

export type ProductTypeDto = {
  id: number;
  name: string;
  description: string;
};

export type BlisterTypeDto = {
  id: number;
  name: string;
  description: string;
  slots: number;
  limitPerBox: number;
};

export type BoxTypeDto = {
  id: number;
  name: string;
  description: string;
};
