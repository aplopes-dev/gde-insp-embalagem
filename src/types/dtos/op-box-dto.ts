import { OpBoxStatus } from "@prisma/client";

type OpBoxDto = {
  id: number;
  code: string;
  barCode?: string;
  barCodeGeneratedAt?: Date;
  createdAt: Date;
  packedAt?: Date;
  status: OpBoxStatus;
  opCode: string;
  boxName: string;
  productName: string;
  quantity: number;
};

export default OpBoxDto;
