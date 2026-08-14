/** Ordena códigos de caixa numericamente ("2" < "10" < "23"). */
export function compareOpBoxCodeAsc(a: string, b: string): number {
  return (Number(a) || 0) - (Number(b) || 0);
}

/** Índice numérico de códigos gerados `GEN_12` → 12; QR real → null. */
export function parseGenBlisterIndex(code: string): number | null {
  const match = /^GEN_(\d+)$/i.exec(code);
  return match ? Number(match[1]) : null;
}

/**
 * Ordem de embalagem dos blisters na caixa.
 * Códigos `GEN_N` ordenam numericamente (evita GEN_10/GEN_12 antes de GEN_2).
 * Após o QR real substituir o GEN, cai no `id` (ordem de criação).
 */
export function compareOpBlisterOrderAsc(
  a: { id: string; code: string },
  b: { id: string; code: string }
): number {
  const na = parseGenBlisterIndex(a.code);
  const nb = parseGenBlisterIndex(b.code);
  if (na != null && nb != null) return na - nb;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return a.code.localeCompare(b.code);
}

export function sortOpBoxBlisters<T extends { id: string; code: string }>(
  blisters: T[]
): T[] {
  return [...blisters].sort(compareOpBlisterOrderAsc);
}

export function sumPlannedBoxQuantity(
  blisters: ReadonlyArray<{ quantity: number }>
): number {
  return blisters.reduce((total, blister) => total + blister.quantity, 0);
}
