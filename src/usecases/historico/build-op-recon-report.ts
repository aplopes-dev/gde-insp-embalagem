import db from "@/providers/database";
import { getOpFromRef } from "@/shared/services/jerp";
import { HistoricoOpReconReport } from "@/types/dtos/historico-op-recon-dto";
import {
  PackedBoxInput,
  buildBarcodeEvents,
  buildInconsistencies,
  computeReconMetrics,
  formatBrt,
} from "./op-recon-math";

export {
  buildBarcodeEvents,
  buildInconsistencies,
  computeReconMetrics,
  extractBarcodeEventDetails,
  formatBrt,
} from "./op-recon-math";

export async function buildOpReconReport(
  opId: number
): Promise<HistoricoOpReconReport | null> {
  const op = await db.op.findUnique({
    where: { id: opId },
    include: {
      product: { select: { name: true, code: true } },
      box: { select: { name: true } },
      blister: { select: { name: true } },
      OpBox: {
        orderBy: { createdAt: "asc" },
        include: {
          OpBoxBlister: true,
        },
      },
      OpOccurrences: {
        orderBy: { number: "asc" },
        include: {
          responsible: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!op) return null;

  const boxes: PackedBoxInput[] = op.OpBox.map((box) => ({
    id: box.id,
    code: box.code,
    status: box.status,
    barCode: box.barCode,
    packedAt: box.packedAt,
    barCodeGeneratedAt: box.barCodeGeneratedAt,
    pieces: box.OpBoxBlister.reduce((acc, bl) => acc + bl.quantity, 0),
  }));

  const boxesById = new Map(boxes.map((b) => [b.id, b]));

  const packedPieces = op.OpBox.reduce(
    (acc, box) =>
      acc +
      box.OpBoxBlister.filter((bl) => bl.packedAt != null).reduce(
        (s, bl) => s + bl.quantity,
        0
      ),
    0
  );
  const totalPieces = boxes.reduce((acc, b) => acc + b.pieces, 0);
  const packedBoxes = boxes.filter(
    (b) => b.status === "PACKAGED" || b.status === "PACKAGED_W_BREAK"
  ).length;
  const pendingBoxes = boxes.filter((b) => b.status === "PENDING").length;
  const withBarcode = boxes.filter((b) => Boolean(b.barCode)).length;
  const barcodePieces = boxes
    .filter((b) => Boolean(b.barCode))
    .reduce((acc, b) => acc + b.pieces, 0);

  const [alertCount, barcodeLogs] = await Promise.all([
    db.opActivityLog.count({
      where: {
        opId,
        OR: [
          { actionType: "DETECTION_INVALID" },
          { actionType: "DETECTION_TIMEOUT" },
          { detectionStatus: { in: ["INVALID", "TIMEOUT"] } },
        ],
      },
    }),
    db.opActivityLog.findMany({
      where: {
        opId,
        details: { path: ["event"], equals: "BARCODE_GENERATED" },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, boxId: true, details: true },
    }),
  ]);

  const barcodeEvents = buildBarcodeEvents(barcodeLogs, boxesById);
  const orphans = barcodeEvents.filter((e) => e.orphan);

  let jerpAvailable = false;
  let jerpError: string | null = null;
  let jerpRemaining: number | null = null;
  let jerpSnapshot: HistoricoOpReconReport["jerp"] = {
    available: false,
    error: null,
    id: null,
    numero: null,
    quantidadeAProduzir: null,
    produto: null,
    embalagens: [],
  };

  try {
    const jerpResult = await getOpFromRef(String(op.id));
    if (jerpResult.isRight()) {
      const jerp = jerpResult.get();
      jerpAvailable = true;
      jerpRemaining = jerp.quantidadeAProduzir;
      jerpSnapshot = {
        available: true,
        error: null,
        id: jerp.id,
        numero: jerp.numero,
        quantidadeAProduzir: jerp.quantidadeAProduzir,
        produto: jerp.produto?.nome ?? null,
        embalagens: (jerp.embalagens ?? []).map((e) => ({
          id: e.id,
          nome: e.nome,
          quantidadeAlocada: e.quantidadeAlocada,
        })),
      };
    } else {
      const left = jerpResult.getLeft();
      jerpError =
        left?.error ??
        `Falha ao consultar JERP para OP ${op.id}/${op.code}`;
      jerpSnapshot = { ...jerpSnapshot, error: jerpError };
    }
  } catch (err) {
    jerpError =
      err instanceof Error ? err.message : "Erro inesperado ao consultar JERP";
    jerpSnapshot = { ...jerpSnapshot, error: jerpError };
  }

  const recon = computeReconMetrics({
    quantityToProduce: op.quantityToProduce,
    totalPieces,
    packedPieces,
    barcodePieces,
    jerpRemaining,
    events: barcodeEvents,
  });

  const barcodeBoxes = boxes
    .filter((b) => Boolean(b.barCode))
    .map((b) => {
      const anomaly =
        b.barCode && b.status === "PENDING"
          ? "Etiqueta presente com status PENDING"
          : null;
      return {
        code: b.code,
        status: b.status,
        barcode: b.barCode ?? "",
        pieces: b.pieces,
        packedAt: formatBrt(b.packedAt),
        barcodeAt: formatBrt(b.barCodeGeneratedAt),
        anomaly,
      };
    });

  const anomalyBoxes = barcodeBoxes
    .filter((b) => b.anomaly)
    .map((b) => ({ code: b.code, status: b.status, barcode: b.barcode }));

  const openOccurrenceCount = op.OpOccurrences.filter(
    (o) => o.status === "OPEN" || o.status === "IN_PROGRESS"
  ).length;

  const occurrences = op.OpOccurrences.map((o) => ({
    number: o.number,
    status: o.status,
    title: o.title,
    description: o.description,
    createdAt: formatBrt(o.createdAt) ?? "",
    resolvedAt: formatBrt(o.resolvedAt),
    resolution: o.resolution,
    responsible: o.responsible
      ? `${o.responsible.name} <${o.responsible.email}>`
      : null,
  }));

  const inconsistencies = buildInconsistencies({
    jerpAvailable,
    jerpError,
    recon,
    orphans,
    anomalyBoxes,
    openOccurrenceCount,
  });

  return {
    generatedAt: formatBrt(new Date()) ?? new Date().toISOString(),
    op: {
      id: op.id,
      code: op.code,
      status: op.status,
      quantityToProduce: op.quantityToProduce,
      createdAt: formatBrt(op.createdAt) ?? "",
      updatedAt: formatBrt(op.updatedAt) ?? "",
      finishedAt: formatBrt(op.finishedAt),
    },
    types: {
      product: op.product?.name ?? "—",
      productCode: op.product?.code ?? "—",
      boxType: op.box?.name ?? "—",
      blisterType: op.blister?.name ?? "—",
    },
    agg: {
      totalBoxes: boxes.length,
      pendingBoxes,
      packedBoxes,
      withBarcode,
      totalPieces,
      packedPieces,
      pendingPiecesGde: op.quantityToProduce - packedPieces,
      barcodePieces,
      alertCount,
      occurrenceCount: op.OpOccurrences.length,
      openOccurrenceCount,
    },
    jerp: jerpSnapshot,
    recon,
    barcodeBoxes,
    barcodeEvents,
    orphans,
    occurrences,
    inconsistencies,
  };
}
