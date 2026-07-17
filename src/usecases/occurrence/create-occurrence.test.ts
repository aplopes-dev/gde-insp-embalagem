import { createOccurrence } from "./create-occurrence";

const mockAggregate = jest.fn();
const mockCreateOccurrence = jest.fn();
const mockUpdateLogs = jest.fn();
const mockUpdateImages = jest.fn();
const mockCreateLog = jest.fn();

jest.mock("@/providers/database", () => ({
  __esModule: true,
  default: {
    opOccurrence: {
      aggregate: (...args: unknown[]) => mockAggregate(...args),
      create: (...args: unknown[]) => mockCreateOccurrence(...args),
    },
    opActivityLog: {
      updateMany: (...args: unknown[]) => mockUpdateLogs(...args),
      create: (...args: unknown[]) => mockCreateLog(...args),
    },
    inspectionImage: {
      updateMany: (...args: unknown[]) => mockUpdateImages(...args),
    },
  },
}));

describe("createOccurrence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAggregate.mockResolvedValue({ _max: { number: 2 } });
    mockCreateOccurrence.mockResolvedValue({ id: "occ-1", number: 3 });
    mockUpdateLogs.mockResolvedValue({ count: 1 });
    mockUpdateImages.mockResolvedValue({ count: 1 });
    mockCreateLog.mockResolvedValue({ id: "log-open" });
  });

  it("numera a ocorrência como max+1 e grava OCCURRENCE_OPENED", async () => {
    const result = await createOccurrence({
      opId: 10,
      title: "Teste",
      description: "Desc",
      openedByUserId: "user-1",
      boxId: "box-1",
      linkActivityLogIds: ["a1"],
      linkImageIds: ["i1"],
      details: { step: "blister" },
    });

    expect(result).toEqual({ id: "occ-1", number: 3 });
    expect(mockCreateOccurrence).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          opId: 10,
          number: 3,
          status: "OPEN",
          title: "Teste",
        }),
      })
    );
    expect(mockUpdateLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["a1"] } },
        data: { occurrenceId: "occ-1" },
      })
    );
    expect(mockCreateLog).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: "OCCURRENCE_OPENED",
          occurrenceId: "occ-1",
        }),
      })
    );
  });

  it("começa em 1 quando não há ocorrências", async () => {
    mockAggregate.mockResolvedValue({ _max: { number: null } });
    mockCreateOccurrence.mockResolvedValue({ id: "occ-2", number: 1 });

    const result = await createOccurrence({
      opId: 1,
      title: "Primeira",
      description: "d",
      openedByUserId: "u",
    });

    expect(result.number).toBe(1);
    expect(mockCreateOccurrence.mock.calls[0][0].data.number).toBe(1);
  });
});
