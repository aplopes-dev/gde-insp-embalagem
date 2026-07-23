export type HistoricoOpReconInconsistency = {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
};

export type HistoricoOpReconBarcodeBox = {
  code: string;
  status: string;
  barcode: string;
  pieces: number;
  packedAt: string | null;
  barcodeAt: string | null;
  anomaly: string | null;
};

export type HistoricoOpReconBarcodeEvent = {
  at: string;
  boxCode: string;
  boxId: string | null;
  idBarras: string;
  currentBarcode: string;
  quantidadeApontada: number;
  quantidadePendente: number | null;
  orphan: boolean;
};

export type HistoricoOpReconOccurrence = {
  number: number;
  status: string;
  title: string;
  description: string;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  responsible: string | null;
};

export type HistoricoOpReconReport = {
  generatedAt: string;
  op: {
    id: number;
    code: string;
    status: string;
    quantityToProduce: number;
    createdAt: string;
    updatedAt: string;
    finishedAt: string | null;
  };
  types: {
    product: string;
    productCode: string;
    boxType: string;
    blisterType: string;
  };
  agg: {
    totalBoxes: number;
    pendingBoxes: number;
    packedBoxes: number;
    withBarcode: number;
    totalPieces: number;
    packedPieces: number;
    pendingPiecesGde: number;
    barcodePieces: number;
    alertCount: number;
    occurrenceCount: number;
    openOccurrenceCount: number;
  };
  jerp: {
    available: boolean;
    error: string | null;
    id: number | null;
    numero: number | null;
    quantidadeAProduzir: number | null;
    produto: string | null;
    embalagens: { id: number; nome: string; quantidadeAlocada: number }[];
  };
  recon: {
    pendingEqJerp: boolean | null;
    pendingDelta: number | null;
    qtyMinusBarcode: number;
    qtyMinusBarcodeEqJerp: boolean | null;
    pieceHole: number;
    baseline: number | null;
    jerpConsumed: number | null;
    gapConsumedVsBarcodes: number | null;
    sumApontLog: number;
    sumActive: number;
    sumOrphan: number;
  };
  barcodeBoxes: HistoricoOpReconBarcodeBox[];
  barcodeEvents: HistoricoOpReconBarcodeEvent[];
  orphans: HistoricoOpReconBarcodeEvent[];
  occurrences: HistoricoOpReconOccurrence[];
  inconsistencies: HistoricoOpReconInconsistency[];
};
