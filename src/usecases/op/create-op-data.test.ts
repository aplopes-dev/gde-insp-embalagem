import {
  createOpData,
  createOpBoxesData,
  createOpBoxBlistersData,
  maxPackedOpBoxCode,
} from "./create-op-data";

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

  it("após quebra, recria pendentes na sequência das embaladas (não salta pendentes)", () => {
    // Cenário OP 80257: caixas 1–8 embaladas, 9–19 ainda pendentes no snapshot.
    const maxCode = maxPackedOpBoxCode([
      ...Array.from({ length: 8 }, (_, i) => ({
        code: String(i + 1),
        packedAt: new Date(),
      })),
      ...Array.from({ length: 11 }, (_, i) => ({
        code: String(i + 9),
        packedAt: null,
      })),
    ]);

    expect(maxCode).toBe(8);

    const boxes = createOpBoxesData({
      quantityToProduce: 835,
      blisterSlots: 6,
      blisterPerBox: 13,
      boxGap: maxCode,
    });

    expect(boxes[0].code).toBe("9");
    expect(boxes.map((b) => b.code)).not.toContain("20");
  });
});

describe("maxPackedOpBoxCode", () => {
  it("ignora caixas pendentes ao calcular o gap", () => {
    expect(
      maxPackedOpBoxCode([
        { code: "8", packedAt: new Date() },
        { code: "19", packedAt: null },
      ])
    ).toBe(8);
  });

  it("retorna 0 quando não há caixas embaladas", () => {
    expect(
      maxPackedOpBoxCode([
        { code: "1", packedAt: null },
        { code: "2", packedAt: null },
      ])
    ).toBe(0);
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
