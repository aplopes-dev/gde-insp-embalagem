import {
  closeOccurrence,
  updateOccurrence,
} from "./close-occurrence";

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockCreateLog = jest.fn();

jest.mock("@/providers/database", () => ({
  __esModule: true,
  default: {
    opOccurrence: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    opActivityLog: {
      create: (...args: unknown[]) => mockCreateLog(...args),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        opOccurrence: {
          update: (...args: unknown[]) => mockUpdate(...args),
        },
        opActivityLog: {
          create: (...args: unknown[]) => mockCreateLog(...args),
        },
      }),
  },
}));

describe("closeOccurrence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindFirst.mockResolvedValue({
      id: "occ-1",
      number: 2,
      status: "OPEN",
      resolution: null,
    });
    mockUpdate.mockResolvedValue({ id: "occ-1", number: 2, status: "CLOSED" });
    mockCreateLog.mockResolvedValue({ id: "log-1" });
  });

  it("fecha ocorrência e grava OCCURRENCE_CLOSED", async () => {
    const result = await closeOccurrence({
      occurrenceId: "occ-1",
      opId: 10,
      closedByUserId: "sup-1",
      resolution: "Ajuste de blister realizado",
    });

    expect(result).toEqual({ id: "occ-1", number: 2 });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CLOSED",
          resolution: "Ajuste de blister realizado",
          resolvedById: "sup-1",
        }),
      })
    );
    expect(mockCreateLog).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: "OCCURRENCE_CLOSED",
        }),
      })
    );
  });

  it("rejeita resolução vazia", async () => {
    await expect(
      closeOccurrence({
        occurrenceId: "occ-1",
        opId: 10,
        closedByUserId: "sup-1",
        resolution: "   ",
      })
    ).rejects.toThrow(/Resolução/);
  });

  it("rejeita ocorrência já fechada", async () => {
    mockFindFirst.mockResolvedValue({
      id: "occ-1",
      number: 2,
      status: "CLOSED",
      resolution: "ok",
    });

    await expect(
      closeOccurrence({
        occurrenceId: "occ-1",
        opId: 10,
        closedByUserId: "sup-1",
        resolution: "nova",
      })
    ).rejects.toThrow(/já está fechada/);
  });
});

describe("updateOccurrence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindFirst.mockResolvedValue({
      id: "occ-1",
      number: 2,
      status: "OPEN",
      resolution: null,
    });
    mockUpdate.mockResolvedValue({
      id: "occ-1",
      number: 2,
      status: "IN_PROGRESS",
    });
  });

  it("atualiza status para IN_PROGRESS", async () => {
    const result = await updateOccurrence({
      occurrenceId: "occ-1",
      opId: 10,
      status: "IN_PROGRESS",
      updatedByUserId: "sup-1",
    });

    expect(result.status).toBe("IN_PROGRESS");
    expect(mockUpdate).toHaveBeenCalled();
  });
});
