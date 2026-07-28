import {
  compareOpBoxCodeAsc,
  sortOpBoxBlisters,
  sumPlannedBoxQuantity,
} from "./find-next-pending-op-box";

describe("compareOpBoxCodeAsc", () => {
  it("ordena numericamente e não como string", () => {
    const codes = ["22", "3", "1", "23", "10", "2"];
    expect([...codes].sort(compareOpBoxCodeAsc)).toEqual([
      "1",
      "2",
      "3",
      "10",
      "22",
      "23",
    ]);
  });
});

describe("sortOpBoxBlisters", () => {
  it("não coloca GEN_12 (parcial) no meio por ordem lexicográfica", () => {
    // Cenário OP 80257 caixa 71: índice único (opBoxId, code) devolve
    // GEN_1, GEN_10, GEN_11, GEN_12, GEN_2… e a UI mostra 1 peça na ordem 4.
    const sorted = sortOpBoxBlisters([
      { id: "a01", code: "GEN_1", quantity: 6 },
      { id: "a10", code: "GEN_10", quantity: 6 },
      { id: "a11", code: "GEN_11", quantity: 6 },
      { id: "a12", code: "GEN_12", quantity: 1 },
      { id: "a02", code: "GEN_2", quantity: 6 },
      { id: "a03", code: "GEN_3", quantity: 6 },
      { id: "a04", code: "GEN_4", quantity: 6 },
      { id: "a05", code: "GEN_5", quantity: 6 },
      { id: "a06", code: "GEN_6", quantity: 6 },
      { id: "a07", code: "GEN_7", quantity: 6 },
      { id: "a08", code: "GEN_8", quantity: 6 },
      { id: "a09", code: "GEN_9", quantity: 6 },
    ]);

    expect(sorted.map((b) => b.code)).toEqual([
      "GEN_1",
      "GEN_2",
      "GEN_3",
      "GEN_4",
      "GEN_5",
      "GEN_6",
      "GEN_7",
      "GEN_8",
      "GEN_9",
      "GEN_10",
      "GEN_11",
      "GEN_12",
    ]);
    expect(sorted[11].quantity).toBe(1);
    expect(sorted.reduce((s, b) => s + b.quantity, 0)).toBe(67);
  });
});

describe("sumPlannedBoxQuantity", () => {
  it("soma as quantidades planejadas dos blisters da caixa", () => {
    expect(
      sumPlannedBoxQuantity([
        { quantity: 6 },
        { quantity: 6 },
        { quantity: 6 },
        { quantity: 6 },
      ])
    ).toBe(24);
  });
});
