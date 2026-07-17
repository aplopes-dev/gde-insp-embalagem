/**
 * Regras de negócio para persistência de detecções e auto-abertura de ocorrência.
 * Aprovado na Fase 0 (debounce 2–3s + limiar 3 consecutivos).
 */

/** Janela de debounce técnico (ms) para o mesmo op+caixa+step+status. */
export const DETECTION_DEBOUNCE_MS = 2500;

/**
 * Quantidade de INVALID consecutivos (já após debounce), na mesma caixa + step,
 * necessária para abrir automaticamente uma OpOccurrence.
 */
export const AUTO_OCCURRENCE_THRESHOLD = 3;

export type DetectionKeyParts = {
  opId: number;
  boxId: string | null | undefined;
  step: string;
  status: "INVALID" | "TIMEOUT" | string;
};

export function buildDetectionDebounceKey(parts: DetectionKeyParts): string {
  const box = parts.boxId?.trim() || "_";
  return `${parts.opId}|${box}|${parts.step}|${parts.status}`;
}

/**
 * Decide se um novo evento deve ser gravado, dado o timestamp do último evento
 * com a mesma chave de debounce.
 */
export function shouldPersistDetection(
  lastPersistedAtMs: number | null | undefined,
  nowMs: number,
  debounceMs: number = DETECTION_DEBOUNCE_MS
): boolean {
  if (lastPersistedAtMs == null) return true;
  return nowMs - lastPersistedAtMs >= debounceMs;
}

/**
 * Decide se deve abrir ocorrência formal após N eventos INVALID consecutivos.
 */
export function shouldOpenOccurrence(
  consecutiveInvalidCount: number,
  threshold: number = AUTO_OCCURRENCE_THRESHOLD
): boolean {
  return consecutiveInvalidCount >= threshold;
}
