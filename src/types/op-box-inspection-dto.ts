import { OpBoxStatus, OpStatus } from "@prisma/client";

export type OpInspectionDto = {
  opId: number;
  opCode: string;
  status: OpStatus;
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
  blisterCodes: string[];
  requiresSupervisorConfig?: boolean;
};

export type OpBoxInspectionDto = {
  id: string;
  code: string;
  status: InspectionStatus;
  createdAt: Date;
  packedAt?: Date;
  OpBoxBlister?: OpBoxBlisterInspection[];
};

export type OpBoxBlisterInspection = {
  id: string;
  code: string;
  quantity: number;
  packedAt?: Date;
  isValidItem?: boolean;
  isValidQuantity?: boolean;
  status?: number;
};

export type ProductTypeDto = {
  id: number;
  code: string;
  name: string;
  description: string;
};

export type BlisterTypeDto = {
  id: number;
  code: string;
  name: string;
  description: string;
  slots: number;
  limitPerBox: number;
};

export type BoxTypeDto = {
  id: number;
  code: string;
  name: string;
  description: string;
};

export enum InspectionStatus {
  PENDING,
  VALID
}
