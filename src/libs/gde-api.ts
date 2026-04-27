/**
 * Cliente HTTP para o backend Nest (`gde-api`), Fase 5.
 * Ative com USE_GDE_API=true e defina GDE_API_URL + GDE_API_KEY.
 */

function baseUrl(): string {
  const u = process.env.GDE_API_URL?.replace(/\/$/, '');
  if (!u) throw new Error('GDE_API_URL não configurado');
  return u;
}

function apiKey(): string {
  const k = process.env.GDE_API_KEY;
  if (!k) throw new Error('GDE_API_KEY não configurado');
  return k;
}

export function useGdeApi(): boolean {
  return process.env.USE_GDE_API === 'true';
}

async function gdeFetch<T>(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<T> {
  const method = init.method ?? 'POST';
  const headers: Record<string, string> = {
    'x-gde-api-key': apiKey(),
    ...(init.headers ?? {}),
  };
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `GDE API ${res.status}`);
  }
  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

export async function nestPublishCommand(body: unknown, userId?: string): Promise<{ message: string }> {
  return gdeFetch('/v1/messaging/commands', {
    body,
    headers: userId ? { 'x-user-id': userId } : undefined,
  });
}

export async function nestPublishDetection(body: Record<string, unknown>): Promise<{ message: string }> {
  return gdeFetch('/v1/messaging/detection', { body });
}

export async function nestPublishMobile(body: Record<string, unknown>): Promise<{ message: string }> {
  return gdeFetch('/v1/messaging/mobile', { body });
}

export async function nestListOps(): Promise<unknown[]> {
  return gdeFetch<unknown[]>('/v1/ops', { method: 'GET' });
}

export async function nestCreateOp(body: Record<string, unknown>): Promise<unknown> {
  return gdeFetch('/v1/ops', { body });
}

export async function nestGetOp(id: number | string): Promise<unknown> {
  return gdeFetch(`/v1/ops/${id}`, { method: 'GET' });
}

export async function nestUpdateOp(
  id: number | string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return gdeFetch(`/v1/ops/${id}`, { method: 'PUT', body });
}

export async function nestDeleteOp(id: number | string): Promise<unknown> {
  return gdeFetch(`/v1/ops/${id}`, { method: 'DELETE' });
}

export async function nestGetActivityLog(id: number | string): Promise<unknown[]> {
  return gdeFetch<unknown[]>(`/v1/ops/${id}/activity-log`, { method: 'GET' });
}

export async function nestPostActivityLog(
  id: number | string,
  body: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  return gdeFetch(`/v1/ops/${id}/activity-log`, {
    body,
    headers: { 'x-user-id': userId },
  });
}

export async function nestGetStatistics(id: number | string): Promise<unknown> {
  return gdeFetch(`/v1/ops/${id}/statistics`, { method: 'GET' });
}

export async function nestGetOperatorStats(
  id: number | string,
  query?: { startDate?: string; endDate?: string },
): Promise<unknown[]> {
  const qs = new URLSearchParams();
  if (query?.startDate) qs.set('startDate', query.startDate);
  if (query?.endDate) qs.set('endDate', query.endDate);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return gdeFetch<unknown[]>(`/v1/ops/${id}/operators-stats${suffix}`, { method: 'GET' });
}
