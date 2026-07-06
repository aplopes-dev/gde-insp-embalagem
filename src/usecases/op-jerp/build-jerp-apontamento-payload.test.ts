import { buildJerpApontamentoPayload } from "./build-jerp-apontamento-payload";

describe("buildJerpApontamentoPayload", () => {
  it("monta blisters com barcode para o apontamento no JERP", () => {
    const result = buildJerpApontamentoPayload([
      { code: "0710380009", quantity: 7 },
      { code: "0710380006", quantity: 7 },
      { code: "0710380005", quantity: 7 },
    ]);

    expect(result).toEqual([
      { barcode: "0710380009" },
      { barcode: "0710380006" },
      { barcode: "0710380005" },
    ]);
  });
});
