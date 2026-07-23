import {
  buildBarcodeEvents,
  buildInconsistencies,
  computeReconMetrics,
  extractBarcodeEventDetails,
} from "./op-recon-math";

describe("historico recon report helpers", () => {
  it("extracts BARCODE_GENERATED details", () => {
    expect(
      extractBarcodeEventDetails({
        event: "BARCODE_GENERATED",
        idBarras: 1842151,
        quantidadeApontada: 105,
        quantidadePendente: 3589,
      })
    ).toEqual({
      idBarras: "1842151",
      quantidadeApontada: 105,
      quantidadePendente: 3589,
    });

    expect(extractBarcodeEventDetails({ event: "OTHER" })).toBeNull();
  });

  it("marks orphan barcode events when idBarras != current", () => {
    const boxesById = new Map([
      [
        "box-3",
        {
          id: "box-3",
          code: "3",
          status: "PACKAGED",
          barCode: "1842153",
          packedAt: new Date(),
          barCodeGeneratedAt: new Date(),
          pieces: 105,
        },
      ],
    ]);

    const events = buildBarcodeEvents(
      [
        {
          createdAt: new Date("2026-07-21T11:28:32Z"),
          boxId: "box-3",
          details: {
            event: "BARCODE_GENERATED",
            idBarras: "1842151",
            quantidadeApontada: 105,
            quantidadePendente: 3589,
          },
        },
        {
          createdAt: new Date("2026-07-21T11:29:45Z"),
          boxId: "box-3",
          details: {
            event: "BARCODE_GENERATED",
            idBarras: "1842153",
            quantidadeApontada: 105,
            quantidadePendente: 3484,
          },
        },
      ],
      boxesById
    );

    expect(events).toHaveLength(2);
    expect(events[0].orphan).toBe(true);
    expect(events[1].orphan).toBe(false);
  });

  it("computes recon metrics like OP72747 summary shape", () => {
    const events = [
      {
        at: "a",
        boxCode: "1",
        boxId: "1",
        idBarras: "1",
        currentBarcode: "1",
        quantidadeApontada: 105,
        quantidadePendente: 3799,
        orphan: false,
      },
      {
        at: "b",
        boxCode: "3",
        boxId: "3",
        idBarras: "1842151",
        currentBarcode: "1842153",
        quantidadeApontada: 105,
        quantidadePendente: 3589,
        orphan: true,
      },
    ];

    const recon = computeReconMetrics({
      quantityToProduce: 3694,
      totalPieces: 3589,
      packedPieces: 1193,
      barcodePieces: 1193,
      jerpRemaining: 2396,
      events,
    });

    expect(recon.pieceHole).toBe(105);
    expect(recon.pendingEqJerp).toBe(true);
    expect(recon.pendingDelta).toBe(0);
    expect(recon.qtyMinusBarcode).toBe(2501);
    expect(recon.qtyMinusBarcodeEqJerp).toBe(false);
    expect(recon.baseline).toBe(3904);
    expect(recon.jerpConsumed).toBe(1508);
    expect(recon.gapConsumedVsBarcodes).toBe(315);
    expect(recon.sumOrphan).toBe(105);
  });

  it("builds inconsistency list including aligned info", () => {
    const aligned = buildInconsistencies({
      jerpAvailable: true,
      jerpError: null,
      recon: {
        pendingEqJerp: true,
        pendingDelta: 0,
        qtyMinusBarcode: 100,
        qtyMinusBarcodeEqJerp: true,
        pieceHole: 0,
        baseline: 100,
        jerpConsumed: 0,
        gapConsumedVsBarcodes: 0,
        sumApontLog: 0,
        sumActive: 0,
        sumOrphan: 0,
      },
      orphans: [],
      anomalyBoxes: [],
      openOccurrenceCount: 0,
    });
    expect(aligned.some((i) => i.code === "ALIGNED")).toBe(true);

    const broken = buildInconsistencies({
      jerpAvailable: true,
      jerpError: null,
      recon: {
        pendingEqJerp: false,
        pendingDelta: 10,
        qtyMinusBarcode: 100,
        qtyMinusBarcodeEqJerp: false,
        pieceHole: 105,
        baseline: null,
        jerpConsumed: null,
        gapConsumedVsBarcodes: 20,
        sumApontLog: 0,
        sumActive: 0,
        sumOrphan: 0,
      },
      orphans: [
        {
          at: "",
          boxCode: "",
          boxId: null,
          idBarras: "x",
          currentBarcode: "",
          quantidadeApontada: 105,
          quantidadePendente: null,
          orphan: true,
        },
      ],
      anomalyBoxes: [{ code: "5", status: "PENDING", barcode: "999" }],
      openOccurrenceCount: 2,
    });

    expect(broken.map((i) => i.code)).toEqual(
      expect.arrayContaining([
        "PENDING_NE_JERP",
        "QTY_MINUS_BARCODE_NE_JERP",
        "PIECE_HOLE",
        "GAP_CONSUMED_VS_BARCODES",
        "ORPHAN_BARCODES",
        "ANOMALY_BOX_BARCODE_PENDING",
        "OPEN_OCCURRENCES",
      ])
    );
  });
});
