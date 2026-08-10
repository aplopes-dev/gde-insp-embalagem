/**
 * Data de pasta das imagens de log (YYYY-MM-DD).
 * O worker Python grava com datetime.now() no fuso da máquina (Brasil).
 * O frontend deve usar o mesmo critério — nunca toISOString() (UTC).
 */
export const LOG_IMAGE_TIME_ZONE =
  process.env.NEXT_PUBLIC_LOG_IMAGE_TZ?.trim() || "America/Sao_Paulo";

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LOG_IMAGE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD no fuso das pastas de log (default America/Sao_Paulo). */
export function formatLogImageDatePath(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  // en-CA → YYYY-MM-DD
  return ymdFormatter.format(d);
}

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Desloca uma data YYYY-MM-DD em N dias (calendário civil). */
export function shiftYmd(ymd: string, deltaDays: number): string | null {
  const m = YMD_RE.exec(ymd);
  if (!m) return null;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/**
 * Candidatos de pasta para lookup: path pedido, depois ±1 dia
 * (corrige embalagens noturnas quando o cliente mandou UTC).
 */
export function logImageDatePathCandidates(primary: string): string[] {
  const out: string[] = [];
  const push = (p: string | null) => {
    if (p && !out.includes(p)) out.push(p);
  };
  push(primary);
  push(shiftYmd(primary, -1));
  push(shiftYmd(primary, 1));
  return out;
}
