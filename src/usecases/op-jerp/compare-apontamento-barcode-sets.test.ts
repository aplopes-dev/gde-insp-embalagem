import {
  compareApontamentoBarcodeSets,
  normalizeApontamentoBarcodes,
} from "./compare-apontamento-barcode-sets";

describe("normalizeApontamentoBarcodes", () => {
  it("remove placeholders, trim e ordena", () => {
    expect(
      normalizeApontamentoBarcodes(["08056900054", " GEN_1 ", "08056900046", "08056900054", null])
    ).toEqual(["08056900046", "08056900054"]);
  });
});

describe("compareApontamentoBarcodeSets", () => {
  it("considera iguais independentemente da ordem", () => {
    const result = compareApontamentoBarcodeSets(
      ["08056900054", "08056900046"],
      ["08056900046", "08056900054"]
    );
    expect(result.equal).toBe(true);
    expect(result.onlyInOriginal).toEqual([]);
    expect(result.onlyInCurrent).toEqual([]);
  });

  it("detecta divergência (caso lote 1851454)", () => {
    const original = [
      "08056900054",
      "08056900053",
      "08056900052",
      "08056900051",
      "08056900050",
      "08056900049",
      "08056900048",
      "08056900047",
      "08056900046",
    ];
    const current = [
      "08056900136",
      "08056900137",
      "08056900138",
      "08056900139",
      "08056900140",
      "08056900141",
      "08056900142",
      "08056900143",
      "08056900144",
    ];
    const result = compareApontamentoBarcodeSets(original, current);
    expect(result.equal).toBe(false);
    expect(result.onlyInOriginal).toEqual(original.slice().sort());
    expect(result.onlyInCurrent).toEqual(current.slice().sort());
  });
});
