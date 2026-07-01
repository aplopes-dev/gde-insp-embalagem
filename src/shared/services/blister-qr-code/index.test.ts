import { blisterQrMatchesOp, parseBlisterQrCode } from ".";

describe("parseBlisterQrCode", () => {
  it("extrai OP e sequencial de um QR válido", () => {
    const result = parseBlisterQrCode("07832200001");
    expect(result).toEqual({
      ok: true,
      opNumber: "78322",
      serial: "00001",
      raw: "07832200001",
    });
  });

  it("rejeita prefixo inválido", () => {
    expect(parseBlisterQrCode("17832200001")).toEqual({
      ok: false,
      reason: "INVALID_PREFIX",
    });
  });

  it("rejeita código curto", () => {
    expect(parseBlisterQrCode("07832")).toEqual({
      ok: false,
      reason: "TOO_SHORT",
    });
  });

  it("rejeita string vazia", () => {
    expect(parseBlisterQrCode("")).toEqual({ ok: false, reason: "EMPTY" });
    expect(parseBlisterQrCode("   ")).toEqual({ ok: false, reason: "EMPTY" });
  });

  it("rejeita caracteres não numéricos", () => {
    expect(parseBlisterQrCode("07832A00001")).toEqual({
      ok: false,
      reason: "NOT_NUMERIC",
    });
  });

  it("faz trim do código", () => {
    const result = parseBlisterQrCode("  07832200001  ");
    expect(result).toEqual({
      ok: true,
      opNumber: "78322",
      serial: "00001",
      raw: "07832200001",
    });
  });
});

describe("blisterQrMatchesOp", () => {
  it("aceita QR quando OP coincide", () => {
    expect(blisterQrMatchesOp("07832200001", "78322")).toEqual({ valid: true });
  });

  it("aceita OP com zeros à esquerda na comparação numérica", () => {
    expect(blisterQrMatchesOp("00783200001", "7832")).toEqual({ valid: true });
  });

  it("rejeita OP divergente", () => {
    expect(blisterQrMatchesOp("07832200001", "99999")).toEqual({
      valid: false,
      reason: "OP_MISMATCH",
      qrOp: "78322",
    });
  });

  it("rejeita formato inválido", () => {
    expect(blisterQrMatchesOp("17832200001", "78322")).toEqual({
      valid: false,
      reason: "INVALID_FORMAT",
    });
  });
});
