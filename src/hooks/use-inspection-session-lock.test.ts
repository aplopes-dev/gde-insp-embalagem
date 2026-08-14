/** @jest-environment jsdom */

import { renderHook, act } from "@testing-library/react";
import { useInspectionSessionLock } from "./use-inspection-session-lock";

describe("useInspectionSessionLock", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("libera liderança quando deviceId ou opId faltam", async () => {
    const { result } = renderHook(() =>
      useInspectionSessionLock(undefined, "457901")
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isChecking).toBe(false);
    expect(result.current.isLeader).toBe(true);
  });

  it("não quebra quando crypto.randomUUID não existe (HTTP / RealWear)", async () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: undefined,
    });

    try {
      const { result } = renderHook(() =>
        useInspectionSessionLock("realwear_01", "457901")
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(result.current.isChecking).toBe(false);
      expect(result.current.isLeader).toBe(true);
    } finally {
      Object.defineProperty(crypto, "randomUUID", {
        configurable: true,
        value: original,
      });
    }
  });

  it("marca aba secundária como não-líder via localStorage", async () => {
    const deviceId = "realwear_03";
    const key = `gde:inspection-lock:${deviceId}`;

    localStorage.setItem(
      key,
      JSON.stringify({ tabId: "outra-aba", ts: Date.now() })
    );

    const { result } = renderHook(() =>
      useInspectionSessionLock(deviceId, "457901")
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.isChecking).toBe(false);
    expect(result.current.isLeader).toBe(false);
  });
});
