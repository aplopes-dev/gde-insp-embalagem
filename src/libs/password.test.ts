import { isStrongPassword } from "./password";

describe("isStrongPassword", () => {
  it("valid when has number, uppercase and special", () => {
    expect(isStrongPassword("Abc123!")) .toBe(true);
  });
  it("invalid without number", () => {
    expect(isStrongPassword("Abcdef!")) .toBe(false);
  });
  it("invalid without uppercase", () => {
    expect(isStrongPassword("abc123!")) .toBe(false);
  });
  it("invalid without special", () => {
    expect(isStrongPassword("Abc1234")) .toBe(false);
  });
});

