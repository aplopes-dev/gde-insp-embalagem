import { buildJerpBlisterApontamento } from "./build-jerp-blister-apontamento";

describe("buildJerpBlisterApontamento", () => {
  it("monta codigo, quantidade e fileName por blister embalado", () => {
    const result = buildJerpBlisterApontamento(438999, "box-abc", [
      { code: "07809900614", quantity: 6 },
      { code: "07809900615", quantity: 6 },
    ]);

    expect(result).toEqual([
      {
        codigo: "07809900614",
        quantidade: 6,
        fileName: "OP_438999_BOX_box-abc_BL_07809900614",
      },
      {
        codigo: "07809900615",
        quantidade: 6,
        fileName: "OP_438999_BOX_box-abc_BL_07809900615",
      },
    ]);
  });

  it("retorna array vazio quando não há blisters", () => {
    expect(buildJerpBlisterApontamento(1, "box-1", [])).toEqual([]);
  });
});
