/**
 * Compara conjuntos de barcodes de blister (ordem irrelevante).
 * Usado para detectar divergência entre o apontamento original e o estado atual da caixa.
 */
export function normalizeApontamentoBarcodes(
  codes: ReadonlyArray<string | null | undefined>
): string[] {
  return Array.from(
    new Set(
      codes
        .map((c) => c?.trim())
        .filter((c): c is string => Boolean(c) && !/^GEN_/i.test(c))
    )
  ).sort();
}

export type ApontamentoBarcodeSetComparison = {
  equal: boolean;
  original: string[];
  current: string[];
  onlyInOriginal: string[];
  onlyInCurrent: string[];
};

export function compareApontamentoBarcodeSets(
  originalCodes: ReadonlyArray<string | null | undefined>,
  currentCodes: ReadonlyArray<string | null | undefined>
): ApontamentoBarcodeSetComparison {
  const original = normalizeApontamentoBarcodes(originalCodes);
  const current = normalizeApontamentoBarcodes(currentCodes);
  const originalSet = new Set(original);
  const currentSet = new Set(current);

  const onlyInOriginal = original.filter((c) => !currentSet.has(c));
  const onlyInCurrent = current.filter((c) => !originalSet.has(c));

  return {
    equal: onlyInOriginal.length === 0 && onlyInCurrent.length === 0,
    original,
    current,
    onlyInOriginal,
    onlyInCurrent,
  };
}
