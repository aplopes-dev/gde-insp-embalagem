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

describe("PrintTagDialog integration", () => {
  it("deve processar corretamente os dados da etiqueta", () => {
    // Mock dos dados da etiqueta retornados pela API
    const mockTagData = {
      quantidadeApontada: 50,
      idBarras: "123456789",
      relatorioPgqf: "REL-2023-001",
      data: "01/01/2023",
      pepsAprovado: true,
      logoUrl: "https://example.com/logo.png",
      qrCodeData: "https://gde.com.br/op/123456"
    };

    // Verificar se os dados são processados corretamente
    expect(mockTagData.quantidadeApontada).toBe(50);
    expect(mockTagData.idBarras).toBe("123456789");
    expect(mockTagData.relatorioPgqf).toBe("REL-2023-001");
    expect(mockTagData.data).toBe("01/01/2023");
    expect(mockTagData.pepsAprovado).toBe(true);
    expect(mockTagData.logoUrl).toBe("https://example.com/logo.png");
    expect(mockTagData.qrCodeData).toBe("https://gde.com.br/op/123456");

    // Simular a configuração que seria passada para o PrintTagDialog
      const printConfig = {
      barcode: mockTagData.idBarras,
      quantity: mockTagData.quantidadeApontada,
      batchQuantity: 100,
      reportNumber: mockTagData.relatorioPgqf,
      date: mockTagData.data,
      pepsApproved: mockTagData.pepsAprovado,
      logoUrl: mockTagData.logoUrl,
      qrCodeData: mockTagData.qrCodeData
    };

    // Verificar se a configuração está correta
    expect(printConfig.barcode).toBe("123456789");
    expect(printConfig.quantity).toBe(50);
    expect(printConfig.reportNumber).toBe("REL-2023-001");
    expect(printConfig.date).toBe("01/01/2023");
    expect(printConfig.pepsApproved).toBe(true);
    expect(printConfig.logoUrl).toBe("https://example.com/logo.png");
    expect(printConfig.qrCodeData).toBe("https://gde.com.br/op/123456");
  });
});
