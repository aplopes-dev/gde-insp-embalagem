
import { createOpBoxesData } from "./create-op-data";

describe("createOpBoxesData - última caixa após quebra", () => {
  it("cria 10 blisters para 59 unidades pendentes (6 slots, 13 por caixa)", () => {
    const boxes = createOpBoxesData({
      quantityToProduce: 59,
      blisterSlots: 6,
      blisterPerBox: 13,
      boxGap: 12,
    });

    expect(boxes).toHaveLength(1);
    expect(boxes[0].code).toBe("13");
    expect(boxes[0].blisters).toHaveLength(10);

    const totalProducts = boxes[0].blisters!.reduce((sum, bl) => sum + bl.quantity, 0);
    expect(totalProducts).toBe(59);
    expect(boxes[0].blisters![9].quantity).toBe(5);
  });

  it("cria 9 blisters para 54 unidades pendentes", () => {
    const boxes = createOpBoxesData({
      quantityToProduce: 54,
      blisterSlots: 6,
      blisterPerBox: 13,
      boxGap: 16,
    });

    expect(boxes).toHaveLength(1);
    expect(boxes[0].code).toBe("17");
    expect(boxes[0].blisters).toHaveLength(9);

    const totalProducts = boxes[0].blisters!.reduce((sum, bl) => sum + bl.quantity, 0);
    expect(totalProducts).toBe(54);
  });
});
