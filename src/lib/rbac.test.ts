import {
  canAccessAdmin,
  canAccessHistorico,
  canOperateInspection,
  hasRole,
  isAppRole,
  isAuditor,
  isOperador,
  isSupervisor,
} from "./rbac-roles";

describe("rbac", () => {
  describe("isAppRole", () => {
    it("accepts known roles", () => {
      expect(isAppRole("SUPERVISOR")).toBe(true);
      expect(isAppRole("OPERADOR")).toBe(true);
      expect(isAppRole("AUDITOR")).toBe(true);
    });

    it("rejects unknown values", () => {
      expect(isAppRole("ADMIN")).toBe(false);
      expect(isAppRole(null)).toBe(false);
      expect(isAppRole(undefined)).toBe(false);
    });
  });

  describe("hasRole", () => {
    it("allows matching role", () => {
      expect(hasRole("AUDITOR", ["AUDITOR"])).toBe(true);
      expect(hasRole("SUPERVISOR", ["SUPERVISOR", "AUDITOR"])).toBe(true);
    });

    it("denies non-matching role", () => {
      expect(hasRole("SUPERVISOR", ["AUDITOR"])).toBe(false);
      expect(hasRole("OPERADOR", ["AUDITOR"])).toBe(false);
    });
  });

  describe("historico exclusivity", () => {
    it("only AUDITOR can access historico", () => {
      expect(canAccessHistorico("AUDITOR")).toBe(true);
      expect(canAccessHistorico("SUPERVISOR")).toBe(false);
      expect(canAccessHistorico("OPERADOR")).toBe(false);
    });

    it("only SUPERVISOR can access admin", () => {
      expect(canAccessAdmin("SUPERVISOR")).toBe(true);
      expect(canAccessAdmin("AUDITOR")).toBe(false);
      expect(canAccessAdmin("OPERADOR")).toBe(false);
    });
  });

  describe("inspection floor", () => {
    it("OPERADOR, SUPERVISOR and AUDITOR can operate inspection", () => {
      expect(canOperateInspection("OPERADOR")).toBe(true);
      expect(canOperateInspection("SUPERVISOR")).toBe(true);
      expect(canOperateInspection("AUDITOR")).toBe(true);
      expect(canOperateInspection("ADMIN")).toBe(false);
    });
  });

  describe("role helpers", () => {
    it("identifies each role", () => {
      expect(isSupervisor("SUPERVISOR")).toBe(true);
      expect(isAuditor("AUDITOR")).toBe(true);
      expect(isOperador("OPERADOR")).toBe(true);
    });
  });
});
