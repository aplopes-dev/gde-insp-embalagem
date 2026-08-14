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
  resolveSequentialClaim,
} from "./claim-next-pending-op-box";

const expireBefore = new Date("2026-08-14T18:00:00.000Z");
const activeLock = new Date("2026-08-14T18:20:00.000Z");
const expiredLock = new Date("2026-08-14T17:00:00.000Z");

describe("resolveSequentialClaim", () => {
  it("não há caixa quando não há pendentes", () => {
    expect(resolveSequentialClaim([], "u1", expireBefore)).toEqual({
      action: "none",
      next: undefined,
    });
  });

  it("reserva a menor caixa pendente quando está livre", () => {
    const decision = resolveSequentialClaim(
      [
        {
          id: "box-8",
          code: "8",
          inspectionLockedByUserId: null,
          inspectionLockedAt: null,
        },
        {
          id: "box-7",
          code: "7",
          inspectionLockedByUserId: null,
          inspectionLockedAt: null,
        },
      ],
      "user-elizeu",
      expireBefore
    );

    expect(decision.action).toBe("claim");
    expect(decision.next?.code).toBe("7");
  });

  it("espera na próxima da sequência em vez de saltar para a seguinte", () => {
    const decision = resolveSequentialClaim(
      [
        {
          id: "box-54",
          code: "54",
          inspectionLockedByUserId: "user-ruan",
          inspectionLockedAt: activeLock,
        },
        {
          id: "box-55",
          code: "55",
          inspectionLockedByUserId: null,
          inspectionLockedAt: null,
        },
      ],
      "user-elizeu",
      expireBefore
    );

    expect(decision.action).toBe("wait");
    expect(decision.next?.code).toBe("54");
  });

  it("não retoma lock próprio numa caixa posterior enquanto a anterior está pendente", () => {
    const decision = resolveSequentialClaim(
      [
        {
          id: "box-53",
          code: "53",
          inspectionLockedByUserId: "user-elizeu",
          inspectionLockedAt: activeLock,
        },
        {
          id: "box-54",
          code: "54",
          inspectionLockedByUserId: "user-ruan",
          inspectionLockedAt: activeLock,
        },
      ],
      "user-ruan",
      expireBefore
    );

    expect(decision.action).toBe("wait");
    expect(decision.next?.code).toBe("53");
  });

  it("renova quando a próxima da sequência já é do próprio operador", () => {
    const decision = resolveSequentialClaim(
      [
        {
          id: "box-54",
          code: "54",
          inspectionLockedByUserId: "user-ruan",
          inspectionLockedAt: activeLock,
        },
        {
          id: "box-55",
          code: "55",
          inspectionLockedByUserId: null,
          inspectionLockedAt: null,
        },
      ],
      "user-ruan",
      expireBefore
    );

    expect(decision.action).toBe("claim");
    expect(decision.next?.code).toBe("54");
  });

  it("assume a caixa quando o lock do outro operador já expirou", () => {
    const decision = resolveSequentialClaim(
      [
        {
          id: "box-54",
          code: "54",
          inspectionLockedByUserId: "user-ruan",
          inspectionLockedAt: expiredLock,
        },
        {
          id: "box-55",
          code: "55",
          inspectionLockedByUserId: null,
          inspectionLockedAt: null,
        },
      ],
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

  it("renova lock da própria caixa quando ela é a próxima da sequência", async () => {
    findManyMock.mockResolvedValueOnce([
      {
        id: "box-a",
        code: "7",
        inspectionLockedByUserId: "user-emerson",
        inspectionLockedAt: activeLock,
      },
    ]);
    updateManyMock
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    findUniqueMock.mockResolvedValueOnce({
      id: "box-a",
      code: "7",
      packedAt: null,
      OpBoxBlister: [{ id: "b1", code: "GEN_1" }],
    });

    const box = await claimNextPendingOpBox(452360, "user-emerson");
    expect(box?.id).toBe("box-a");
    expect(updateManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ id: "box-a" }),
        data: expect.objectContaining({
          inspectionLockedByUserId: "user-emerson",
        }),
      })
    );
  });

  it("não entrega a caixa 8 quando a 7 está com outro operador", async () => {
    findManyMock.mockResolvedValueOnce([
      {
        id: "box-7",
        code: "7",
        inspectionLockedByUserId: "user-ruan",
        inspectionLockedAt: new Date(),
      },
      {
        id: "box-8",
        code: "8",
        inspectionLockedByUserId: null,
        inspectionLockedAt: null,
      },
    ]);
    updateManyMock.mockResolvedValueOnce({ count: 0 });

    const box = await claimNextPendingOpBox(457845, "user-elizeu");
    expect(box).toBeUndefined();
    expect(updateManyMock).toHaveBeenCalledTimes(1);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
