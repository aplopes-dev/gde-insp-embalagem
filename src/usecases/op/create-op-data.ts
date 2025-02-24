import { Op, OpBlister, OpBox } from "@/types/op"

type InternalOpConfig = {
  id: number
  code: string
  productTypeId: number
  blisterTypeId: number
  boxTypeId: number
  quantityToProduce: number
  blisterSlots: number
  blisterPerBox: number
  boxGap: number
}

export function createOpData(opConfig: InternalOpConfig): Op {
  const { id, code, productTypeId, blisterTypeId, boxTypeId, quantityToProduce, blisterSlots, blisterPerBox, boxGap } = opConfig;

  if (!id || !code || !productTypeId || !blisterTypeId || !boxTypeId) throw new Error("Campos obrigatórios da OP ausentes.");
  if (quantityToProduce <= 0) throw new Error("Quantidade a produzir deve ser maior que zero.");
  if (blisterSlots <= 0) throw new Error("BlisterSlots deve ser maior que zero.");
  if (blisterPerBox <= 0) throw new Error("BlisterPerBox deve ser maior que zero.");

  const boxes = createOpBoxesData({ quantityToProduce, blisterSlots, blisterPerBox, boxGap });

  return {
    id,
    code,
    productTypeId,
    blisterTypeId,
    boxTypeId,
    quantityToProduce,
    boxes
  };
}

type OpBoxesConfig = {
  quantityToProduce: number
  blisterSlots: number
  blisterPerBox: number
  boxGap: number
}

export function createOpBoxesData(boxesConfig: OpBoxesConfig): OpBox[] {
  const { quantityToProduce, blisterSlots, blisterPerBox, boxGap = 0 } = boxesConfig;

  if (quantityToProduce <= 0) throw new Error("Quantidade a produzir deve ser maior que zero.");
  if (blisterSlots <= 0) throw new Error("BlisterSlots deve ser maior que zero.");
  if (blisterPerBox <= 0) throw new Error("BlisterPerBox deve ser maior que zero.");

  const blistersToProduce = Math.ceil(quantityToProduce / blisterSlots);
  const boxesToProduce = Math.ceil(blistersToProduce / blisterPerBox);

  return Array.from({ length: boxesToProduce }, (_, i) => ({
    code: `${i + 1 + boxGap}`,
    blisters: createOpBoxBlistersData({
      quantityToProduce,
      blisterSlots,
      blisterPerBox,
      boxIndex: i,
      boxesToProduce,
    }),
  }));
}

type OpBlisterConfig = {
  quantityToProduce: number
  blisterPerBox: number
  blisterSlots: number
  boxIndex: number
  boxesToProduce: number
}

export function createOpBoxBlistersData(blistersConfig: OpBlisterConfig): OpBlister[] {
  const { quantityToProduce, blisterSlots, blisterPerBox, boxIndex, boxesToProduce } = blistersConfig;

  if (quantityToProduce <= 0) throw new Error("Quantidade a produzir deve ser maior que zero.");
  if (blisterSlots <= 0) throw new Error("BlisterSlots deve ser maior que zero.");
  if (blisterPerBox <= 0) throw new Error("BlisterPerBox deve ser maior que zero.");
  if (boxIndex < 0 || boxesToProduce <= 0) throw new Error("Parâmetros de indexação de caixas inválidos.");

  const blistersToProduce = Math.ceil(quantityToProduce / blisterSlots);
  const isLastBox = boxIndex + 1 === boxesToProduce;
  const blisterCount = isLastBox ? (blistersToProduce % blisterPerBox || blisterPerBox) : blisterPerBox;
  const lastBlisterQuantity = quantityToProduce % blisterSlots || blisterSlots;

  return Array.from({ length: blisterCount }, (_, i) => ({
    code: `${i + 1}`,
    quantity: isLastBox && i + 1 === blisterCount ? lastBlisterQuantity : blisterSlots,
  }));
}
