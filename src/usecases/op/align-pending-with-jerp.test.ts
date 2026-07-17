import {
  decideAlignPendingWithJerp,
  hasInProgressPendingBox,
  sumInternalPendingPieces,
} from "./align-pending-with-jerp";

describe("hasInProgressPendingBox", () => {
  it("detecta blister packed em caixa ainda pendente", () => {
    expect(
      hasInProgressPendingBox([
        {
          packedAt: null,
          OpBoxBlister: [
            { packedAt: new Date(), quantity: 4 },
            { packedAt: null, quantity: 4 },
          ],
        },
      ])
    ).toBe(true);
  });

  it("ignora caixas já embaladas", () => {
    expect(
      hasInProgressPendingBox([
        {
          packedAt: new Date(),
          OpBoxBlister: [{ packedAt: new Date(), quantity: 36 }],
        },
        {
          packedAt: null,
          OpBoxBlister: [{ packedAt: null, quantity: 36 }],
        },
      ])
    ).toBe(false);
  });
});

describe("decideAlignPendingWithJerp", () => {
  const emptyPending = {
    packedAt: null,
    OpBoxBlister: [
      { packedAt: null, quantity: 4 },
      { packedAt: null, quantity: 4 },
    ],
  };

  it("noop quando pendente interno = JERP", () => {
    expect(
      decideAlignPendingWithJerp({
        boxes: [emptyPending],
        jerpRemaining: 8,
      })
    ).toEqual({ action: "noop", reason: "aligned" });
  });

  it("recalcula quando diverge e não há inspeção a meio", () => {
    expect(
      decideAlignPendingWithJerp({
        boxes: [emptyPending],
        jerpRemaining: 80,
      })
    ).toEqual({
      action: "recalculate",
      reason: "diverged",
      internalPending: 8,
      jerpRemaining: 80,
    });
  });

  it("não apaga progresso se há blister já conferido na pendente", () => {
    expect(
      decideAlignPendingWithJerp({
        boxes: [
          {
            packedAt: null,
            OpBoxBlister: [
              { packedAt: new Date(), quantity: 4 },
              { packedAt: null, quantity: 4 },
            ],
          },
        ],
        jerpRemaining: 80,
      })
    ).toEqual({
      action: "skip_in_progress",
      reason: "diverged_but_inspection_in_progress",
      internalPending: 8,
      jerpRemaining: 80,
    });
  });

  it("recria pendentes quando pending=0 e JERP ainda tem resto", () => {
    expect(
      decideAlignPendingWithJerp({
        boxes: [
          {
            packedAt: new Date(),
            OpBoxBlister: [{ packedAt: new Date(), quantity: 36 }],
          },
        ],
        jerpRemaining: 80,
      })
    ).toEqual({
      action: "recalculate",
      reason: "diverged",
      internalPending: 0,
      jerpRemaining: 80,
    });
  });
});

describe("sumInternalPendingPieces", () => {
  it("soma só caixas sem packedAt", () => {
    expect(
      sumInternalPendingPieces([
        {
          packedAt: new Date(),
          OpBoxBlister: [{ packedAt: new Date(), quantity: 36 }],
        },
        {
          packedAt: null,
          OpBoxBlister: [
            { packedAt: null, quantity: 36 },
            { packedAt: null, quantity: 36 },
          ],
        },
      ])
    ).toBe(72);
  });
});
