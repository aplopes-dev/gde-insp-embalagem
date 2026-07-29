import db from "@/providers/database";

function isPlaceholderBlisterCode(code: string | null | undefined): boolean {
  if (!code?.trim()) return true;
  return /^GEN_/i.test(code.trim());
}

/**
 * Devolve QR codes (não-placeholder) que já estão embalados noutra caixa da mesma OP.
 * Usado antes de persistir packedAt para impedir reutilização de blister.
 */
export async function findConflictingPackedBlisterCodes(
  opId: number,
  opBoxId: string,
  codes: ReadonlyArray<string | null | undefined>
): Promise<string[]> {
  const realCodes = [
    ...new Set(
      codes
        .map((c) => c?.trim())
        .filter((c): c is string => Boolean(c) && !isPlaceholderBlisterCode(c))
    ),
  ];

  if (realCodes.length === 0) return [];

  const conflicts = await db.opBoxBlister.findMany({
    where: {
      code: { in: realCodes },
      packedAt: { not: null },
      opBox: { opId },
      NOT: { opBoxId },
    },
    select: { code: true },
  });

  return [...new Set(conflicts.map((c) => c.code))];
}

/** Detecta o mesmo QR repetido mais do que uma vez na própria caixa. */
export function findDuplicateCodesInBatch(
  codes: ReadonlyArray<string | null | undefined>
): string[] {
  const seen = new Map<string, number>();
  for (const raw of codes) {
    const code = raw?.trim();
    if (!code || isPlaceholderBlisterCode(code)) continue;
    seen.set(code, (seen.get(code) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([code]) => code);
}
