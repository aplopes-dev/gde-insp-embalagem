import { buildJerpEmbalagemApontamento } from "./build-jerp-embalagem-apontamento";

describe("buildJerpEmbalagemApontamento", () => {
  it("monta embalagens com o código de barras (barcode) de cada blister", () => {
    const result = buildJerpEmbalagemApontamento([
      { code: "82389201", quantity: 7 },
      { code: "82389202", quantity: 7 },
      { code: "82389203", quantity: 7 },
    ]);

    expect(result).toEqual([
      { barcode: "82389201" },
      { barcode: "82389202" },
      { barcode: "82389203" },
    ]);
  });

  it("retorna array vazio quando não há blisters", () => {
    expect(buildJerpEmbalagemApontamento([])).toEqual([]);
  });
});
