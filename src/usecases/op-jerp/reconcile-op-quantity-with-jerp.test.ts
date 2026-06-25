import {
  reconcileOpQuantityWithJerp,
  resolvePendingQuantity,
} from "./reconcile-op-quantity-with-jerp";

describe("resolvePendingQuantity", () => {
  it("prioriza quantidade restante do JERP", () => {
    expect(resolvePendingQuantity(881, 940, 59)).toBe(59);
  });

  it("usa diferença local quando JERP não está disponível", () => {
    expect(resolvePendingQuantity(881, 940)).toBe(59);
  });

  it("não retorna valor negativo", () => {
    expect(resolvePendingQuantity(900, 940)).toBe(40);
    expect(resolvePendingQuantity(950, 940)).toBe(0);
  });
});

describe("reconcileOpQuantityWithJerp", () => {
  it("exporta função de reconciliação", () => {
    expect(typeof reconcileOpQuantityWithJerp).toBe("function");
  });
});
