export type ValidableType = "product" | "box" | "blister";

export type ObjectValidation = {
  type: ValidableType;
  code: string;
  name: string;
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
