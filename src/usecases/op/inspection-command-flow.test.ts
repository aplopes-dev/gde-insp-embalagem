import {
  computeCommandDelay,
  gateDetectionByRequest,
  newRequestId,
} from "./inspection-command-flow";

describe("computeCommandDelay", () => {
  it("usa o atraso pedido quando o comando é diferente do anterior", () => {
    expect(
      computeCommandDelay({
        requestedDelayMs: 0,
        sameAsLast: false,
        msSinceLastSend: 100,
        minRepeatMs: 2500,
      })
    ).toBe(0);
  });

  it("adia comando idêntico até cumprir o intervalo mínimo (não descarta)", () => {
    expect(
      computeCommandDelay({
        requestedDelayMs: 1500,
        sameAsLast: true,
        msSinceLastSend: 500,
        minRepeatMs: 2500,
      })
    ).toBe(2000);
  });

  it("mantém o atraso pedido quando o intervalo mínimo já passou", () => {
    expect(
      computeCommandDelay({
        requestedDelayMs: 1500,
        sameAsLast: true,
        msSinceLastSend: 10_000,
        minRepeatMs: 2500,
      })
    ).toBe(1500);
  });
});

describe("gateDetectionByRequest", () => {
  it("aceita evento sem request_id (worker antigo)", () => {
    expect(gateDetectionByRequest(undefined, "a", true)).toBe("accept");
  });

  it("aceita a primeira resposta ao pedido em curso", () => {
    expect(gateDetectionByRequest("a", "a", false)).toBe("accept");
  });

  it("descarta resposta repetida ao mesmo pedido", () => {
    expect(gateDetectionByRequest("a", "a", true)).toBe("stale");
  });

  it("descarta resposta a pedido anterior", () => {
    expect(gateDetectionByRequest("old", "new", false)).toBe("stale");
  });
});

describe("newRequestId", () => {
  it("gera ids distintos", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newRequestId()));
    expect(ids.size).toBe(50);
  });
});
