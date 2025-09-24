// Serviço de integração com JERP
// Usa variáveis de ambiente: JERP_API, JERP_TOKEN

import { JerpUserDTO } from "@/shared/dtos/jerp";

export async function fetchJerpUser(inscription: string): Promise<JerpUserDTO | null> {
  const base = process.env.JERP_API;
  if (!base) throw new Error("JERP_API não configurada");
  const url = `${base.replace(/\/$/, "")}/users/inscriptions/${encodeURIComponent(inscription)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.JERP_TOKEN ? { Authorization: `Bearer ${process.env.JERP_TOKEN}` } : {}),
    },
    // timeout control pode ser adicionado via AbortController se necessário
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Falha ao consultar JERP (${res.status})`);
  const data = await res.json();
  // Esperado: { inscription: string, nome: string, cargo: string }
  const inscriptionValue = data?.inscription ?? data?.inscricao; // compatibilidade
  if (!inscriptionValue || !data?.nome) return null;
  return { inscription: String(inscriptionValue), nome: String(data.nome), cargo: String(data.cargo ?? "") };
}



export async function verifyJerpPassword(inscription: string, password: string): Promise<boolean> {
  const base = process.env.JERP_API;
  if (!base) throw new Error("JERP_API não configurada");
  const url = `${base.replace(/\/$/, "")}/users/inscriptions/${encodeURIComponent(inscription)}/verify-password`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.JERP_TOKEN ? { Authorization: `Bearer ${process.env.JERP_TOKEN}` } : {}),
    },
    body: JSON.stringify({ password }),
  });
  if (res.status === 200 || res.status === 204) return true;
  if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) return false;
  if (!res.ok) throw new Error(`Falha ao verificar senha no JERP (${res.status})`);
  return false;
}
