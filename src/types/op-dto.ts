import { OpStatus } from "@prisma/client";

export type OpDto = {
  id: number;
  code: string;
  oculosInstanceId?: string | null;
  status: OpStatus;
  quantityToProduce: number;
  productTypeId: number;
  product: OpProductDto;
  box?: OpBoxDto;
  blister?: OpBlisterDto;
  createdAt: Date;
  finishedAt?: Date;
};

type OpProductDto = {
  code: string;
  name: string;
  description?: string;
};

type OpBoxDto = {
  id: number
  name: string
}

type OpBlisterDto = {
  id: number
  name: string
}