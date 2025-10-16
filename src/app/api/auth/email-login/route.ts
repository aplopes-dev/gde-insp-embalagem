// POST /api/auth/email-login (aceita email)
// Fluxo de primeiro acesso por email:
// - Se usuário existir localmente, responde { status: "LOCAL" }
// - Se não existir, consulta JERP; se encontrado, responde { status: "JERP", user }
// - Se não encontrar no JERP, 404 com mensagem solicitada

import { NextResponse } from "next/server";
import db from "@/providers/database";
import { fetchJerpUser } from "@/shared/services/jerp";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email: string | undefined = body?.email?.toString().trim();
    const loginKey: string = email || body?.inscription?.toString().trim() || ""; // compat: aceita ambos por enquanto
    if (!loginKey) return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });

    const local = await db.user.findUnique({ where: { email: loginKey } });
    if (local) {
      return NextResponse.json({ status: "LOCAL" });
    }

    const jerp = await fetchJerpUser(loginKey);
    if (jerp) {
      return NextResponse.json({ status: "JERP", user: jerp });
    }

    return NextResponse.json({ error: "usuario não encontrado no sistema interno, contacre o suporte" }, { status: 404 });
  } catch (e) {
    console.error("[EMAIL_LOGIN]", e);
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }
}

