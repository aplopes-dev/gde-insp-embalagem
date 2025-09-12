import { validatePasswordPolicy } from "../password-policy";

describe("validatePasswordPolicy", () => {
  it("reprova senhas muito curtas", () => {
    expect(validatePasswordPolicy("Ab1!").ok).toBe(false);
  });
  it("reprova senhas sem maiuscula", () => {
    const res = validatePasswordPolicy("abcde1!f");
    expect(res.ok).toBe(false);
  });
  it("reprova senhas sem minuscula", () => {
    const res = validatePasswordPolicy("ABCDEFG1!");
    expect(res.ok).toBe(false);
  });
  it("reprova senhas sem numero", () => {
    const res = validatePasswordPolicy("Abcdefg!!");
    expect(res.ok).toBe(false);
  });
  it("reprova senhas sem especial", () => {
    const res = validatePasswordPolicy("Abcdefg1");
    expect(res.ok).toBe(false);
  });
  it("aprova senha valida", () => {
    const res = validatePasswordPolicy("Abcdef1!");
    expect(res.ok).toBe(true);
  });
});

