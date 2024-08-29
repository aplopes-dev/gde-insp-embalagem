export type OpDto = {
  id: number;
  code: string;
  status: number;
  quantityToProduce: number;
  productTypeId: number;
  product: OpProductDto;
  createdAt: Date;
  finishedAt?: Date;
};

type OpProductDto = {
  code: string;
  name: string;
};
