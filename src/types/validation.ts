export type ValidableType = "product" | "box" | "blister";

export type ObjectValidation = {
  // type: ValidableType;
  // code: string;
  itemId: string;
  // name: string;
  count: number;
};

export type Box = {
  code: string;
  name: string;
};

export type Blister = {
  code: string;
  name: string;
};

export type Item = {
  code: string;
  name: string;
};
