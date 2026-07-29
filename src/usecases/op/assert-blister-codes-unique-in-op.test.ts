import { findDuplicateCodesInBatch } from "./assert-blister-codes-unique-in-op";

describe("findDuplicateCodesInBatch", () => {
  it("ignora placeholders GEN_", () => {
    expect(findDuplicateCodesInBatch(["GEN_1", "GEN_1", "07830900020"])).toEqual(
      []
    );
  });

  it("detecta QR repetido na mesma caixa", () => {
    expect(
      findDuplicateCodesInBatch([
        "07830900020",
        "07830900021",
        "07830900020",
      ])
    ).toEqual(["07830900020"]);
  });
});
