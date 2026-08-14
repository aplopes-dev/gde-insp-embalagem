/**
 * @jest-environment node
 */
const findManyMock = jest.fn();
const findUniqueMock = jest.fn();
const updateManyMock = jest.fn();

jest.mock("@/providers/database", () => ({
  __esModule: true,
  default: {
    opBox: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
    },
  },
}));

import {
  claimNextPendingOpBox,
  isImmediateNextPending,
  pendingBoxesBlockingPack,
  resolveSequentialClaim,
} from "./claim-next-pending-op-box";

const expireBefore = new Date("2026-08-14T18:00:00.000Z");
const activeLock = new Date("2026-08-14T18:20:00.000Z");
const expiredLock = new Date("2026-08-14T17:00:00.000Z");

function box(
  id: string,
  code: string,
  lockedBy: string | null = null,
  at: Date | null = null
) {
  return {
    id,
    code,
    inspectionLockedByUserId: lockedBy,
    inspectionLockedAt: at,
  };
}

describe("isImmediateNextPending", () => {
  it("54 → 55", () => {
    expect(isImmediateNextPending("54", "55")).toBe(true);
  });

  it("54 → 56 não", () => {
    expect(isImmediateNextPending("54", "56")).toBe(false);
  });
});

describe("pendingBoxesBlockingPack", () => {
  it("permite 56 com 55 ainda pendente", () => {
    expect(pendingBoxesBlockingPack("56", ["55", "57"])).toEqual([]);
  });

  it("bloqueia 56 com furo na 54", () => {
    expect(pendingBoxesBlockingPack("56", ["54", "55"])).toEqual(["54"]);
  });
});

describe("resolveSequentialClaim", () => {
  it("não há caixa quando não há pendentes", () => {
    expect(resolveSequentialClaim([], "u1", expireBefore)).toEqual({
      action: "none",
      next: undefined,
    });
  });

  it("reserva a menor caixa livre", () => {
    const decision = resolveSequentialClaim(
      [box("b8", "8"), box("b7", "7")],
      "user-elizeu",
      expireBefore
    );
    expect(decision.action).toBe("claim");
    expect(decision.next?.code).toBe("7");
  });

  it("Elizeu na 54 → Ruan pega a 55", () => {
    const decision = resolveSequentialClaim(
      [
        box("b54", "54", "user-elizeu", activeLock),
        box("b55", "55"),
        box("b56", "56"),
      ],
      "user-ruan",
      expireBefore
    );
    expect(decision.action).toBe("claim");
    expect(decision.next?.code).toBe("55");
  });

  it("Elizeu acabou a 54 → pega a 56 enquanto Ruan está na 55", () => {
    const decision = resolveSequentialClaim(
      [box("b55", "55", "user-ruan", activeLock), box("b56", "56")],
      "user-elizeu",
      expireBefore
    );
    expect(decision.action).toBe("claim");
    expect(decision.next?.code).toBe("56");
  });

  it("depois da 56, se a 54 ficou livre, Elizeu recebe a 54 (furo)", () => {
    const decision = resolveSequentialClaim(
      [box("b54", "54"), box("b57", "57")],
      "user-elizeu",
      expireBefore
    );
    expect(decision.action).toBe("claim");
    expect(decision.next?.code).toBe("54");
  });

  it("não salta a 54 activa para ir à 56", () => {
    const decision = resolveSequentialClaim(
      [
        box("b54", "54", "user-ruan", activeLock),
        box("b56", "56"),
      ],
      "user-elizeu",
      expireBefore
    );
    // 55 não existe na lista → 56 não é imediata → espera 54
    expect(decision.action).toBe("wait");
    expect(decision.next?.code).toBe("54");
  });

  it("renova a 55 do Ruan com a 54 noutro posto", () => {
    const decision = resolveSequentialClaim(
      [
        box("b54", "54", "user-elizeu", activeLock),
        box("b55", "55", "user-ruan", activeLock),
      ],
      "user-ruan",
      expireBefore
    );
    expect(decision.action).toBe("claim");
    expect(decision.next?.code).toBe("55");
  });

  it("lock expirado na 54 → caixa livre outra vez", () => {
    const decision = resolveSequentialClaim(
      [box("b54", "54", "user-ruan", expiredLock), box("b55", "55")],
      "user-elizeu",
      expireBefore
    );
    expect(decision.action).toBe("claim");
    expect(decision.next?.code).toBe("54");
  });
});

describe("claimNextPendingOpBox", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("entrega a 55 quando a 54 está com outro operador", async () => {
    findManyMock.mockResolvedValueOnce([
      box("b54", "54", "user-elizeu", new Date()),
      box("b55", "55"),
    ]);
    updateManyMock
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    findUniqueMock.mockResolvedValueOnce({
      id: "b55",
      code: "55",
      packedAt: null,
      OpBoxBlister: [],
    });

    const claimed = await claimNextPendingOpBox(457845, "user-ruan");
    expect(claimed?.id).toBe("b55");
  });
});
