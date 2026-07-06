import { buildJerpApontamentoPayload } from "./build-jerp-apontamento-payload";

describe("buildJerpApontamentoPayload", () => {
  it("monta embalagens e blisters para o apontamento no JERP", () => {
    const result = buildJerpApontamentoPayload(435632, "box-1", [
      { code: "82389201", quantity: 7 },
      { code: "82389202", quantity: 7 },
      { code: "82389203", quantity: 7 },
    ]);

    expect(result.embalagens).toEqual([
      { barcode: "82389201" },
      { barcode: "82389202" },
      { barcode: "82389203" },
    ]);
    expect(result.blisters).toEqual([
      {
        codigo: "82389201",
        quantidade: 7,
        fileName: "OP_435632_BOX_box-1_BL_82389201",
      },
      {
        codigo: "82389202",
        quantidade: 7,
        fileName: "OP_435632_BOX_box-1_BL_82389202",
      },
      {
        codigo: "82389203",
        quantidade: 7,
        fileName: "OP_435632_BOX_box-1_BL_82389203",
      },
    ]);
  });
});
