type OpBoxDto = {
  id: number;
  code: string;
  createdAt: Date;
  packedAt?: Date;
  status: number;
  opCode: string;
  boxName: string;
  productName: string;
  quantity: number;
};

export default OpBoxDto;
