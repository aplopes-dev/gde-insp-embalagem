export type ValidableType = "product" | "box" | "blister";

export type ObjectValidation = {
  type: ValidableType;
  object: Box | Blister | Item;
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
