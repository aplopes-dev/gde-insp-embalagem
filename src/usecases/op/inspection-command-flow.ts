/**
 * Tempos e regras de envio de comandos ao worker na tela de inspeção.
 *
 * NEXT_PUBLIC_* são embutidos no build do Next: alterar exige novo build da imagem.
 */

function msFromEnv(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Mensagem verde visível antes de avançar para o passo seguinte (antes: 4000). */
export const STEP_ADVANCE_DELAY_MS = msFromEnv(
  process.env.NEXT_PUBLIC_INSPECTION_STEP_ADVANCE_MS,
  1000
);

/** Tempo para o operador trocar o blister antes de inspecionar o próximo. */
export const NEXT_BLISTER_DELAY_MS = msFromEnv(
  process.env.NEXT_PUBLIC_INSPECTION_NEXT_BLISTER_MS,
  2500
);

/** Reenvio após resultado inválido ou sem QR (antes: 3000 em todos os comandos). */
export const COMMAND_RETRY_DELAY_MS = msFromEnv(
  process.env.NEXT_PUBLIC_INSPECTION_RETRY_MS,
  1500
);

/** Intervalo mínimo entre dois comandos idênticos publicados. */
export const COMMAND_MIN_REPEAT_MS = msFromEnv(
  process.env.NEXT_PUBLIC_INSPECTION_MIN_REPEAT_MS,
  2500
);

/**
 * Sem resposta do worker: republica o mesmo request_id (o worker devolve o
 * resultado guardado ou ignora se ainda está a contar). 0 desliga.
 */
export const COMMAND_WATCHDOG_MS = msFromEnv(
  process.env.NEXT_PUBLIC_INSPECTION_WATCHDOG_MS,
  12000
);

/**
 * Atraso efectivo do envio: comandos idênticos não saem com menos de
 * `minRepeatMs` entre si. Adia em vez de descartar, para nunca ficar sem
 * comando pendente.
 */
export function computeCommandDelay(params: {
  requestedDelayMs: number;
  sameAsLast: boolean;
  msSinceLastSend: number;
  minRepeatMs?: number;
}): number {
  const requested = Math.max(0, params.requestedDelayMs);
  if (!params.sameAsLast) return requested;
  const minRepeat = params.minRepeatMs ?? COMMAND_MIN_REPEAT_MS;
  return Math.max(requested, minRepeat - Math.max(0, params.msSinceLastSend));
}

/** Id do pedido. crypto.randomUUID só existe em contexto seguro (https/localhost). */
export function newRequestId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand}`;
}

export type DetectionGate = "accept" | "stale";

/**
 * Resultado só conta se responde ao pedido em curso e ainda não respondido.
 * Eventos sem request_id (worker antigo) são sempre aceites.
 */
export function gateDetectionByRequest(
  detectionRequestId: string | undefined,
  currentRequestId: string | null,
  alreadyAnswered: boolean
): DetectionGate {
  if (!detectionRequestId) return "accept";
  if (detectionRequestId !== currentRequestId) return "stale";
  return alreadyAnswered ? "stale" : "accept";
}
