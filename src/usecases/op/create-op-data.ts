import { Op, OpBlister, OpBox } from "@/types/op";
import { OpBlisterConfig, OpBoxesConfig, OpConfig } from "@/types/op-config";


export function createOpData(opConfig: OpConfig): Op {
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

/**
 * Maior `code` numérico entre caixas já embaladas.
 * Usado ao recriar pendentes após quebra/reconciliação: as pendentes
 * serão apagadas, então não podem entrar no gap (senão a numeração salta,
 * ex.: 8 → 20 quando existiam pendentes 9–19).
 */
export function maxPackedOpBoxCode(
  boxes: Array<{ code: string; packedAt?: Date | string | null }>
): number {
  return boxes.reduce((max, b) => {
    if (b.packedAt == null) return max;
    return Math.max(max, Number(b.code) || 0);
  }, 0);
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
    code: `GEN_${i + 1}`,
    quantity: isLastBox && i + 1 === blisterCount ? lastBlisterQuantity : blisterSlots,
  }));
}
