/**
 * @jest-environment node
 */
const findUniqueMock = jest.fn();

jest.mock("@/providers/database", () => ({
  __esModule: true,
  default: {
    opBox: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

import { assertOpBoxBlistersMutable } from "./assert-op-box-blisters-mutable";

describe("assertOpBoxBlistersMutable", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("permite persistir quando a caixa ainda não tem etiqueta", async () => {
    findUniqueMock.mockResolvedValueOnce({ barCode: null, code: "7" });
    await expect(assertOpBoxBlistersMutable("box-1")).resolves.toBeUndefined();
  });

  it("bloqueia persistir quando a caixa já tem lote/etiqueta", async () => {
    findUniqueMock.mockResolvedValueOnce({ barCode: "1851454", code: "7" });
    await expect(assertOpBoxBlistersMutable("box-1")).rejects.toThrow(
      /já possui etiqueta \(lote 1851454\)/i
    );
  });

  it("falha se a caixa não existe", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    await expect(assertOpBoxBlistersMutable("missing")).rejects.toThrow(
      /não encontrada/i
    );
  });
});
