import { describe, expect, it } from "@jest/globals";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { selectOpPackagings } from "./select-op-packagings";

describe("selectOpPackagings", () => {
  it("prioriza o blister que combina com o nome da peça e ignora blister de tampa já presente na OP", () => {
    const op: OpJerpDto = {
      id: 432680,
      numero: 73760,
      produto: { id: 48287, nome: "DM-02-0-0001_06" },
      quantidadeAProduzir: 2624,
      embalagens: [
        { id: 44792, nome: "ETIQUETA 12.5X10.5MM - E1", quantidadeAlocada: 2624 },
        { id: 45469, nome: "BLISTER-DM-02-0-0001_06", quantidadeAlocada: 218 },
        { id: 46480, nome: "BLISTER-HB-1140096_02", quantidadeAlocada: 37 },
        { id: 45557, nome: "CAIXA 549X370X193 TRIPLEX", quantidadeAlocada: 37 },
      ],
    };

    const selection = selectOpPackagings(op);

    expect(selection.blisterPackaging?.id).toBe(45469);
    expect(selection.preferredBlisterPackagingId).toBe(45469);
    expect(selection.boxPackaging?.id).toBe(45557);
    expect(selection.blisterPackagings).toHaveLength(2);
  });

  it("mantém o blister único quando a OP tem apenas uma embalagem de blister", () => {
    const op: OpJerpDto = {
      id: 384426,
      numero: 69762,
      produto: { id: 39456, nome: "BL-05760040 LD Rev.1" },
      quantidadeAProduzir: 2776,
      embalagens: [
        {
          id: 39436,
          nome: "Blister BL-057xx040-LE LD Rev.1 Antiestático",
          quantidadeAlocada: 500,
        },
        { id: 3457, nome: "CAIXA 520X320X170 TRIPLEX", quantidadeAlocada: 57 },
      ],
    };

    const selection = selectOpPackagings(op);

    expect(selection.blisterPackaging?.id).toBe(39436);
    expect(selection.preferredBlisterPackagingId).toBe(39436);
    expect(selection.boxPackaging?.id).toBe(3457);
  });
});