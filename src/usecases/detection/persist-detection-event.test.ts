import { persistDetectionEvent } from "./persist-detection-event";

const mockFindFirstLog = jest.fn();
const mockCreateLog = jest.fn();
const mockFindManyLog = jest.fn();
const mockUpdateManyLog = jest.fn();
const mockCreateImage = jest.fn();
const mockUpdateManyImage = jest.fn();
const mockFindFirstOccurrence = jest.fn();

const mockCreateOccurrence = jest.fn();

jest.mock("@/providers/database", () => ({
  __esModule: true,
  default: {
    opActivityLog: {
      findFirst: (...args: unknown[]) => mockFindFirstLog(...args),
      create: (...args: unknown[]) => mockCreateLog(...args),
      findMany: (...args: unknown[]) => mockFindManyLog(...args),
      updateMany: (...args: unknown[]) => mockUpdateManyLog(...args),
    },
    inspectionImage: {
      create: (...args: unknown[]) => mockCreateImage(...args),
      updateMany: (...args: unknown[]) => mockUpdateManyImage(...args),
    },
    opOccurrence: {
      findFirst: (...args: unknown[]) => mockFindFirstOccurrence(...args),
    },
  },
}));

jest.mock("@/usecases/occurrence/create-occurrence", () => ({
  createOccurrence: (...args: unknown[]) => mockCreateOccurrence(...args),
}));

describe("persistDetectionEvent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindFirstLog.mockResolvedValue(null);
    mockCreateLog.mockResolvedValue({ id: "log-1" });
    mockCreateImage.mockResolvedValue({ id: "img-1" });
    mockFindManyLog.mockResolvedValue([]);
    mockFindFirstOccurrence.mockResolvedValue(null);
    mockCreateOccurrence.mockResolvedValue({ id: "occ-1", number: 1 });
  });

  it("persiste INVALID com imagem e filename normalizado", async () => {
    const result = await persistDetectionEvent({
      opId: 7,
      userId: "u1",
      boxId: "box-1",
      step: "quantity",
      status: "INVALID",
      reason: "WRONG_SIDE",
      imageFilename: "OP_7_BOX_box-1_BL_QR1",
      storagePath: "2026-07-17",
      deviceId: "dev-1",
      workerId: "w-1",
      confidence: 0.42,
      defectLabels: ["wrong_side"],
    });

    expect(result.persisted).toBe(true);
    expect(result.activityLogId).toBe("log-1");
    expect(result.imageId).toBe("img-1");
    expect(mockCreateLog).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: "DETECTION_INVALID",
          detectionStatus: "INVALID",
          imageFilename: "OP_7_BOX_box-1_BL_QR1.jpg",
          storagePath: "2026-07-17",
        }),
      })
    );
    expect(mockCreateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          filename: "OP_7_BOX_box-1_BL_QR1.jpg",
          detectionStep: "quantity",
          workerId: "w-1",
        }),
      })
    );
  });

  it("respeita debounce e não grava de novo", async () => {
    mockFindFirstLog.mockResolvedValue({
      createdAt: new Date(Date.now() - 500),
    });

    const result = await persistDetectionEvent({
      opId: 7,
      userId: "u1",
      boxId: "box-1",
      step: "quantity",
      status: "INVALID",
    });

    expect(result).toEqual({
      persisted: false,
      skippedReason: "debounce",
    });
    expect(mockCreateLog).not.toHaveBeenCalled();
  });

  it("abre ocorrência após 3 INVALID consecutivos no mesmo step", async () => {
    mockFindManyLog.mockResolvedValue([
      {
        id: "log-1",
        actionType: "DETECTION_INVALID",
        details: { step: "quantity" },
      },
      {
        id: "log-0",
        actionType: "DETECTION_INVALID",
        details: { step: "quantity" },
      },
      {
        id: "log-prev",
        actionType: "DETECTION_INVALID",
        details: { step: "quantity" },
      },
    ]);

    const result = await persistDetectionEvent({
      opId: 7,
      userId: "u1",
      boxId: "box-1",
      step: "quantity",
      status: "INVALID",
      imageFilename: "OP_7.jpg",
    });

    expect(mockCreateOccurrence).toHaveBeenCalled();
    expect(result.occurrenceId).toBe("occ-1");
  });

  it("não abre ocorrência em TIMEOUT", async () => {
    mockFindManyLog.mockResolvedValue([
      { id: "a", actionType: "DETECTION_TIMEOUT", details: { step: "quantity" } },
      { id: "b", actionType: "DETECTION_TIMEOUT", details: { step: "quantity" } },
      { id: "c", actionType: "DETECTION_TIMEOUT", details: { step: "quantity" } },
    ]);

    const result = await persistDetectionEvent({
      opId: 7,
      userId: "u1",
      boxId: "box-1",
      step: "quantity",
      status: "TIMEOUT",
    });

    expect(result.persisted).toBe(true);
    expect(mockCreateOccurrence).not.toHaveBeenCalled();
    expect(result.occurrenceId).toBeUndefined();
  });

  it("reusa ocorrência OPEN existente com mesmo autoKey", async () => {
    mockFindManyLog.mockResolvedValue([
      { id: "log-1", actionType: "DETECTION_INVALID", details: { step: "quantity" } },
      { id: "log-0", actionType: "DETECTION_INVALID", details: { step: "quantity" } },
      { id: "log-p", actionType: "DETECTION_INVALID", details: { step: "quantity" } },
    ]);
    mockFindFirstOccurrence.mockResolvedValue({ id: "occ-existing" });

    const result = await persistDetectionEvent({
      opId: 7,
      userId: "u1",
      boxId: "box-1",
      step: "quantity",
      status: "INVALID",
      imageFilename: "x.jpg",
    });

    expect(mockCreateOccurrence).not.toHaveBeenCalled();
    expect(result.occurrenceId).toBe("occ-existing");
    expect(mockUpdateManyLog).toHaveBeenCalled();
  });

  it("não conta INVALID se houver outro evento no meio da sequência", async () => {
    mockFindManyLog.mockResolvedValue([
      {
        id: "log-1",
        actionType: "DETECTION_INVALID",
        details: { step: "quantity" },
      },
      {
        id: "approved",
        actionType: "BOX_INSPECTION_APPROVED",
        details: {},
      },
      {
        id: "log-0",
        actionType: "DETECTION_INVALID",
        details: { step: "quantity" },
      },
      {
        id: "log-prev",
        actionType: "DETECTION_INVALID",
        details: { step: "quantity" },
      },
    ]);

    const result = await persistDetectionEvent({
      opId: 7,
      userId: "u1",
      boxId: "box-1",
      step: "quantity",
      status: "INVALID",
    });

    expect(result.persisted).toBe(true);
    expect(mockCreateOccurrence).not.toHaveBeenCalled();
    expect(result.occurrenceId).toBeUndefined();
  });
});
