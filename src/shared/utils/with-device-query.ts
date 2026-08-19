/**
 * Mantém ?deviceId= nas rotas para cada browser de óculos continuar no worker certo.
 */
export function withDeviceQuery(
  path: string,
  deviceId?: string | null
): string {
  const d = deviceId?.trim();
  if (!d) return path;
  const qIndex = path.indexOf("?");
  const pathname = qIndex === -1 ? path : path.slice(0, qIndex);
  const qs = qIndex === -1 ? "" : path.slice(qIndex + 1);
  const params = new URLSearchParams(qs);
  params.set("deviceId", d);
  const next = params.toString();
  return next ? `${pathname}?${next}` : pathname;
}
