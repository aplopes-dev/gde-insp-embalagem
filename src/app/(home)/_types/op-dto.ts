export type OpDto = {
  id: number;
  code: string;
  status: number;
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
};

type OpBoxDto = {
  id: number
  name: string
}

type OpBlisterDto = {
  id: number
  name: string
}