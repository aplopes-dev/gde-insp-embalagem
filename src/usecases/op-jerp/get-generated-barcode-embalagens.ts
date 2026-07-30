import db from "@/providers/database";

type EmbalagemLog = { barcode?: string };
type BarcodeGeneratedDetails = {
  event?: string;
  idBarras?: number | string;
  embalagens?: EmbalagemLog[];
};

function extractCodes(details: BarcodeGeneratedDetails | null | undefined): string[] | null {
  const codes = (details?.embalagens ?? [])
    .map((e) => e.barcode?.trim())
    .filter((c): c is string => Boolean(c));
  return codes.length > 0 ? codes : null;
}

/**
 * Barcodes de blister do apontamento associado à etiqueta atual da caixa.
 * Preferência: log BARCODE_GENERATED cujo idBarras = OpBox.barCode;
 * fallback: mais recente; depois o mais antigo.
 */
export async function getGeneratedBarcodeEmbalagensForBox(
  boxId: string
): Promise<string[] | null> {
  const box = await db.opBox.findUnique({
    where: { id: boxId },
    select: { barCode: true },
  });

  const logs = await db.opActivityLog.findMany({
    where: {
      boxId,
      details: {
        path: ["event"],
        equals: "BARCODE_GENERATED",
      },
    },
    orderBy: { createdAt: "asc" },
    select: { details: true, createdAt: true },
  });

  if (logs.length === 0) return null;

  const parsed = logs.map((l) => ({
    createdAt: l.createdAt,
    details: l.details as BarcodeGeneratedDetails,
  }));

  if (box?.barCode) {
    const match = [...parsed]
      .reverse()
      .find((l) => String(l.details?.idBarras ?? "") === String(box.barCode));
    const fromMatch = extractCodes(match?.details);
    if (fromMatch) return fromMatch;
  }

  const latest = extractCodes(parsed[parsed.length - 1]?.details);
  if (latest) return latest;

  return extractCodes(parsed[0]?.details);
}
