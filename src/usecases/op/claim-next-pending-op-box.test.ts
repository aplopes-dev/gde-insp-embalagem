/**
 * @jest-environment node
 */
const findFirstMock = jest.fn();
const findManyMock = jest.fn();
const findUniqueMock = jest.fn();
const updateMock = jest.fn();
const updateManyMock = jest.fn();

jest.mock("@/providers/database", () => ({
  __esModule: true,
  default: {
    opBox: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      findMany: (...args: unknown[]) => findManyMock(...args),
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
    },
  },
}));

import { claimNextPendingOpBox } from "./claim-next-pending-op-box";

describe("claimNextPendingOpBox", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renova lock da própria caixa", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "box-a", code: "7" });
    updateMock.mockResolvedValueOnce({});
    findUniqueMock.mockResolvedValueOnce({
      id: "box-a",
      code: "7",
      packedAt: null,
      OpBoxBlister: [{ id: "b1", code: "GEN_1" }],
    });

    const box = await claimNextPendingOpBox(452360, "user-emerson");
    expect(box?.id).toBe("box-a");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "box-a" },
        data: expect.objectContaining({ inspectionLockedAt: expect.any(Date) }),
      })
    );
  });

  it("reserva a menor caixa livre quando outra está locked", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    findManyMock.mockResolvedValueOnce([
      { id: "box-7", code: "7" },
      { id: "box-8", code: "8" },
    ]);
    updateManyMock
      .mockResolvedValueOnce({ count: 0 }) // 7 locked by other
      .mockResolvedValueOnce({ count: 1 }); // 8 claimed
    findUniqueMock.mockResolvedValueOnce({
      id: "box-8",
      code: "8",
      packedAt: null,
      OpBoxBlister: [],
    });

    const box = await claimNextPendingOpBox(452360, "user-elizeu");
    expect(box?.id).toBe("box-8");
    expect(updateManyMock).toHaveBeenCalledTimes(2);
  });
});
