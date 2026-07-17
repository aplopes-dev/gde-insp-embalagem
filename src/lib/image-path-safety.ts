import path from "path";

/** Segmento de pasta seguro (ex.: YYYY-MM-DD). Rejeita `.`, `..` e separadores. */
export function isSafePathSegment(segment: string): boolean {
  if (!segment) return false;
  if (segment === "." || segment === "..") return false;
  if (segment.includes("\\") || segment.includes("\0") || segment.includes("/")) {
    return false;
  }
  if (segment.includes("..")) return false;
  return /^[A-Za-z0-9._-]+$/.test(segment);
}

/**
 * Valida `path` + `filename` para servir imagens de log.
 * Retorna segmentos de pasta e o nome do ficheiro, ou null se inválido.
 */
export function sanitizeImageLocation(
  resourcePath: string,
  filename: string
): { pathSegments: string[]; filename: string } | null {
  if (!resourcePath || !filename) return null;

  const pathSegments = resourcePath.split("/").filter(Boolean);
  if (pathSegments.length === 0) return null;
  if (!pathSegments.every(isSafePathSegment)) return null;

  if (filename.includes("/") || filename.includes("\\") || filename.includes("\0")) {
    return null;
  }

  const base = path.basename(filename);
  if (base !== filename) return null;
  if (!isSafePathSegment(base)) return null;

  return { pathSegments, filename: base };
}

/**
 * Garante que o caminho absoluto resolvido permanece dentro do diretório raiz.
 */
export function resolvePathInsideRoot(
  rootDir: string,
  pathSegments: string[],
  filename: string
): string | null {
  if (!rootDir) return null;
  const root = path.resolve(rootDir);
  const resolved = path.resolve(root, ...pathSegments, filename);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(prefix)) {
    return null;
  }
  return resolved;
}
