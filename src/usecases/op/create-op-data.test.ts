import { createOpData, createOpBoxesData, createOpBoxBlistersData } from "./create-op-data";

describe("createOpData", () => {
  it("deve criar uma OP válida", () => {
    const op = createOpData({
      id: 1,
      code: "OP001",
      productTypeId: 10,
      blisterTypeId: 20,
      boxTypeId: 30,
      quantityToProduce: 100,
      blisterSlots: 10,
      blisterPerBox: 5,
      boxGap: 0,
    });

    expect(op.id).toBe(1);
    expect(op.code).toBe("OP001");
    expect(op.quantityToProduce).toBe(100);
    expect(op.boxes?.length).toBeGreaterThan(0);
  });

  it("deve lançar erro para quantidade inválida", () => {
    expect(() =>
      createOpData({
        id: 1,
        code: "OP001",
        productTypeId: 10,
        blisterTypeId: 20,
        boxTypeId: 30,
        quantityToProduce: 0,
        blisterSlots: 10,
        blisterPerBox: 5,
        boxGap: 0,
      })
    ).toThrow("Quantidade a produzir deve ser maior que zero.");
  });
});

describe("createOpBoxesData", () => {
  it("deve criar caixas corretamente", () => {
    const boxes = createOpBoxesData({
      quantityToProduce: 50,
      blisterSlots: 10,
      blisterPerBox: 5,
      boxGap: 0,
    });

    expect(boxes.length).toBe(1);
    expect(boxes[0].blisters?.length).toBe(5);
  });

  it("deve lançar erro para valores inválidos", () => {
    expect(() =>
      createOpBoxesData({
        quantityToProduce: -10,
        blisterSlots: 10,
        blisterPerBox: 5,
        boxGap: 0,
      })
    ).toThrow("Quantidade a produzir deve ser maior que zero.");
  });

  it("continua a numeração a partir do boxGap para evitar códigos duplicados", () => {
    // Simula recriação de pendentes após deleção: maior code existente = 24.
    const boxes = createOpBoxesData({
      quantityToProduce: 100,
      blisterSlots: 10,
      blisterPerBox: 5,
      boxGap: 24,
    });

    expect(boxes.length).toBe(2);
    expect(boxes[0].code).toBe("25");
    expect(boxes[1].code).toBe("26");
  });
});

describe("createOpBoxBlistersData", () => {
  it("deve criar blisters corretamente", () => {
    const blisters = createOpBoxBlistersData({
      quantityToProduce: 50,
      blisterSlots: 10,
      blisterPerBox: 5,
      boxIndex: 0,
      boxesToProduce: 1,
    });

    expect(blisters.length).toBe(5);
    expect(blisters[4].quantity).toBe(10);
  });

  it("deve lançar erro para parâmetros inválidos", () => {
    expect(() =>
      createOpBoxBlistersData({
        quantityToProduce: -10,
        blisterSlots: 10,
        blisterPerBox: 5,
        boxIndex: 0,
        boxesToProduce: 1,
      })
    ).toThrow("Quantidade a produzir deve ser maior que zero.");
  });

  it("deve distribuir corretamente os blisters quando não for divisível uniformemente", () => {
    const blisters = createOpBoxBlistersData({
      quantityToProduce: 12,
      blisterSlots: 5,
      blisterPerBox: 3,
      boxIndex: 0,
      boxesToProduce: 1,
    });

    expect(blisters.length).toBe(3);
    expect(blisters[0].quantity).toBe(5);
    expect(blisters[1].quantity).toBe(5);
    expect(blisters[2].quantity).toBe(2);
  });
});
