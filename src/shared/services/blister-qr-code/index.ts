export type BlisterQrParseResult =
  | { ok: true; opNumber: string; serial: string; raw: string }
  | {
      ok: false;
      reason: "EMPTY" | "INVALID_PREFIX" | "TOO_SHORT" | "NOT_NUMERIC";
    };

export function parseBlisterQrCode(raw: string): BlisterQrParseResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { ok: false, reason: "EMPTY" };
  }

  if (!trimmed.startsWith("0")) {
    return { ok: false, reason: "INVALID_PREFIX" };
  }

  if (trimmed.length < 6) {
    return { ok: false, reason: "TOO_SHORT" };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, reason: "NOT_NUMERIC" };
  }

  return {
    ok: true,
    opNumber: trimmed.slice(1, 6),
    serial: trimmed.slice(6),
    raw: trimmed,
  };
}

export function blisterQrMatchesOp(
  raw: string,
  expectedOpCode: string,
): { valid: true } | { valid: false; reason: "INVALID_FORMAT" | "OP_MISMATCH"; qrOp?: string } {
  const parsed = parseBlisterQrCode(raw);

  if (!parsed.ok) {
    return { valid: false, reason: "INVALID_FORMAT" };
  }

  if (Number(parsed.opNumber) !== Number(expectedOpCode)) {
    return {
      valid: false,
      reason: "OP_MISMATCH",
      qrOp: parsed.opNumber,
    };
  }

  return { valid: true };
}
