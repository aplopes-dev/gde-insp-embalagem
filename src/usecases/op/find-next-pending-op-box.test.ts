import {
  compareOpBoxCodeAsc,
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
