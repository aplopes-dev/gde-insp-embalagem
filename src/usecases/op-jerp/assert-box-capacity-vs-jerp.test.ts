import {
  assertCreateCapacityVsJerp,
  assertEstornoReflectedInJerp,
  computeInternalPending,
  sumBoxPieces,
} from "./assert-box-capacity-vs-jerp";

describe("assert-box-capacity-vs-jerp", () => {
  const boxes = [
    {
      id: "pending-1",
      packedAt: null,
      barCode: null,
      OpBoxBlister: [{ quantity: 48 }],
    },
    {
      id: "packed-1",
      packedAt: new Date(),
      barCode: "BC-1",
      OpBoxBlister: [{ quantity: 48 }],
    },
  ];

  it("sumBoxPieces soma quantidades dos blisters", () => {
    expect(sumBoxPieces({ OpBoxBlister: [{ quantity: 10 }, { quantity: 5 }] })).toBe(
      15
    );
  });

  it("computeInternalPending ignora embaladas e box excluída", () => {
    expect(computeInternalPending(boxes)).toBe(48);
    expect(computeInternalPending(boxes, "pending-1")).toBe(0);
  });

  it("assertEstornoReflectedInJerp bloqueia quando restante é insuficiente", () => {
    const result = assertEstornoReflectedInJerp({
      boxes,
      targetBoxId: "packed-1",
      jerpRemaining: 48,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ESTORNO_NOT_REFLECTED");
      expect(result.requiredRemaining).toBe(96);
    }
  });

  it("assertEstornoReflectedInJerp libera quando JERP já inclui as peças", () => {
    const result = assertEstornoReflectedInJerp({
      boxes,
      targetBoxId: "packed-1",
      jerpRemaining: 96,
    });
    expect(result.ok).toBe(true);
  });

  it("assertCreateCapacityVsJerp valida disponibilidade", () => {
    const fail = assertCreateCapacityVsJerp({
      boxes,
      jerpRemaining: 48,
      requestedPieces: 10,
    });
    expect(fail.ok).toBe(false);

    const ok = assertCreateCapacityVsJerp({
      boxes,
      jerpRemaining: 60,
      requestedPieces: 10,
    });
    expect(ok.ok).toBe(true);
  });
});
