import { describe, it, expect } from "@jest/globals";
import { resolveBreakPendingQuantity } from "./resolve-break-pending-quantity";

describe("resolveBreakPendingQuantity", () => {
  it("desconta a caixa atual quando o JERP ainda inclui essas peças (cenário 80750)", () => {
    expect(
      resolveBreakPendingQuantity({
        localPending: 15,
        jerpRemaining: 10,
        currentBoxPacked: 9,
      })
    ).toBe(1);
  });

  it("usa o restante JERP direto quando já está abaixo das peças da caixa", () => {
    expect(
      resolveBreakPendingQuantity({
        localPending: 5,
        jerpRemaining: 3,
        currentBoxPacked: 9,
      })
    ).toBe(3);
  });

  it("fallback para pendente local se JERP indisponível", () => {
    expect(
      resolveBreakPendingQuantity({
        localPending: 15,
        jerpRemaining: null,
        currentBoxPacked: 9,
      })
    ).toBe(15);
  });

  it("nunca retorna negativo", () => {
    expect(
      resolveBreakPendingQuantity({
        localPending: -2,
        jerpRemaining: 0,
        currentBoxPacked: 5,
      })
    ).toBe(0);
  });

  it("caixa vazia na quebra: pendente = restante JERP", () => {
    expect(
      resolveBreakPendingQuantity({
        localPending: 14,
        jerpRemaining: 14,
        currentBoxPacked: 0,
      })
    ).toBe(14);
  });
});
