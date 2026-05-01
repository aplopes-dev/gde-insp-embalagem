/**
 * Mantém ?deviceId= nas rotas para cada browser de óculos continuar no worker certo.
 */
export function withDeviceQuery(
  path: string,
  deviceId?: string | null
): string {
  const d = deviceId?.trim();
  if (!d) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}deviceId=${encodeURIComponent(d)}`;
}
