import {
  HistoricoOpReconBarcodeEvent,
  HistoricoOpReconInconsistency,
  HistoricoOpReconReport,
} from "@/types/dtos/historico-op-recon-dto";

const BRT = "America/Sao_Paulo";

export function formatBrt(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRT,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

export type PackedBoxInput = {
  id: string;
  code: string;
  status: string;
  barCode: string | null;
  packedAt: Date | null;
  barCodeGeneratedAt: Date | null;
  pieces: number;
};

type BarcodeLogInput = {
  createdAt: Date;
  boxId: string | null;
  details: unknown;
};

export function extractBarcodeEventDetails(details: unknown): {
  idBarras: string;
  quantidadeApontada: number;
  quantidadePendente: number | null;
} | null {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  if (d.event !== "BARCODE_GENERATED") return null;
  const idBarras = d.idBarras != null ? String(d.idBarras) : "";
  const quantidadeApontada = Number(d.quantidadeApontada ?? 0);
  const quantidadePendente =
    d.quantidadePendente == null || d.quantidadePendente === ""
      ? null
      : Number(d.quantidadePendente);
  if (!idBarras) return null;
  return {
    idBarras,
    quantidadeApontada: Number.isFinite(quantidadeApontada) ? quantidadeApontada : 0,
    quantidadePendente:
      quantidadePendente != null && Number.isFinite(quantidadePendente)
        ? quantidadePendente
        : null,
  };
}

export function buildBarcodeEvents(
  logs: BarcodeLogInput[],
  boxesById: Map<string, PackedBoxInput>
): HistoricoOpReconBarcodeEvent[] {
  const events: HistoricoOpReconBarcodeEvent[] = [];
  for (const log of logs) {
    const parsed = extractBarcodeEventDetails(log.details);
    if (!parsed) continue;
    const box = log.boxId ? boxesById.get(log.boxId) : undefined;
    const currentBarcode = box?.barCode ?? "";
    const orphan = parsed.idBarras !== currentBarcode;
    events.push({
      at: formatBrt(log.createdAt) ?? "",
      boxCode: box?.code ?? "",
      boxId: log.boxId,
      idBarras: parsed.idBarras,
      currentBarcode,
      quantidadeApontada: parsed.quantidadeApontada,
      quantidadePendente: parsed.quantidadePendente,
      orphan,
    });
  }
  return events;
}

export function computeReconMetrics(input: {
  quantityToProduce: number;
  totalPieces: number;
  packedPieces: number;
  barcodePieces: number;
  jerpRemaining: number | null;
  events: HistoricoOpReconBarcodeEvent[];
}): HistoricoOpReconReport["recon"] {
  const { quantityToProduce, totalPieces, packedPieces, barcodePieces, jerpRemaining, events } =
    input;

  const pieceHole = quantityToProduce - totalPieces;
  const pendingFromContent = totalPieces - packedPieces;
  const qtyMinusBarcode = quantityToProduce - barcodePieces;

  const orphans = events.filter((e) => e.orphan);
  const sumApontLog = events.reduce((acc, e) => acc + e.quantidadeApontada, 0);
  const sumOrphan = orphans.reduce((acc, e) => acc + e.quantidadeApontada, 0);
  const sumActive = barcodePieces;

  let baseline: number | null = null;
  const firstWithPend = events.find((e) => e.quantidadePendente != null);
  if (firstWithPend?.quantidadePendente != null) {
    baseline = firstWithPend.quantidadePendente + firstWithPend.quantidadeApontada;
  }

  const pendingEqJerp =
    jerpRemaining == null ? null : pendingFromContent === jerpRemaining;
  const pendingDelta =
    jerpRemaining == null ? null : pendingFromContent - jerpRemaining;
  const qtyMinusBarcodeEqJerp =
    jerpRemaining == null ? null : qtyMinusBarcode === jerpRemaining;

  const jerpConsumed =
    baseline != null && jerpRemaining != null ? baseline - jerpRemaining : null;
  const gapConsumedVsBarcodes =
    jerpConsumed != null ? jerpConsumed - sumActive : null;

  return {
    pendingEqJerp,
    pendingDelta,
    qtyMinusBarcode,
    qtyMinusBarcodeEqJerp,
    pieceHole,
    baseline,
    jerpConsumed,
    gapConsumedVsBarcodes,
    sumApontLog,
    sumActive,
    sumOrphan,
  };
}

export function buildInconsistencies(report: {
  jerpAvailable: boolean;
  jerpError: string | null;
  recon: HistoricoOpReconReport["recon"];
  orphans: HistoricoOpReconBarcodeEvent[];
  anomalyBoxes: { code: string; status: string; barcode: string }[];
  openOccurrenceCount: number;
}): HistoricoOpReconInconsistency[] {
  const items: HistoricoOpReconInconsistency[] = [];

  if (!report.jerpAvailable) {
    items.push({
      code: "JERP_UNAVAILABLE",
      severity: "warning",
      message:
        report.jerpError ??
        "JERP indisponível — relatório gerado só com dados locais do GDE.",
    });
  }

  if (report.recon.pendingEqJerp === false) {
    items.push({
      code: "PENDING_NE_JERP",
      severity: "critical",
      message: `Pendente GDE (peças em caixas não embaladas) diverge do restante JERP (delta ${report.recon.pendingDelta}).`,
    });
  }

  if (report.recon.qtyMinusBarcodeEqJerp === false) {
    items.push({
      code: "QTY_MINUS_BARCODE_NE_JERP",
      severity: "warning",
      message: `quantityToProduce − peças com etiqueta (${report.recon.qtyMinusBarcode}) não fecha com restante JERP.`,
    });
  }

  if (report.recon.pieceHole !== 0) {
    items.push({
      code: "PIECE_HOLE",
      severity: report.recon.pieceHole > 0 ? "critical" : "warning",
      message: `Buraco de peças (quantityToProduce − total em caixas) = ${report.recon.pieceHole}.`,
    });
  }

  if (
    report.recon.gapConsumedVsBarcodes != null &&
    report.recon.gapConsumedVsBarcodes !== 0
  ) {
    items.push({
      code: "GAP_CONSUMED_VS_BARCODES",
      severity: "warning",
      message: `Consumo JERP inferido vs. etiquetas ativas: gap ${report.recon.gapConsumedVsBarcodes} peças.`,
    });
  }

  if (report.orphans.length > 0) {
    items.push({
      code: "ORPHAN_BARCODES",
      severity: "critical",
      message: `${report.orphans.length} apontamento(s) com idBarras diferente da etiqueta atual da caixa (repack/estorno incompleto).`,
    });
  }

  for (const box of report.anomalyBoxes) {
    items.push({
      code: "ANOMALY_BOX_BARCODE_PENDING",
      severity: "critical",
      message: `Caixa ${box.code} tem etiqueta ${box.barcode} mas status ${box.status}.`,
    });
  }

  if (report.openOccurrenceCount > 0) {
    items.push({
      code: "OPEN_OCCURRENCES",
      severity: "info",
      message: `${report.openOccurrenceCount} ocorrência(s) ainda aberta(s)/em andamento.`,
    });
  }

  if (items.length === 0 && report.jerpAvailable) {
    items.push({
      code: "ALIGNED",
      severity: "info",
      message: "GDE e JERP alinhados — nenhuma inconsistência detectada.",
    });
  }

  return items;
}
