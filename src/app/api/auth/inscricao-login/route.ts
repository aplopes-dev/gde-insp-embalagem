// POST /api/auth/inscricao-login
// Fluxo de primeiro acesso por inscrição:
// - Se usuário existir localmente, responde { status: "LOCAL" }
// - Se não existir, consulta JERP; se encontrado, responde { status: "JERP", user }
// - Se não encontrar no JERP, 404 com mensagem solicitada

import { NextResponse } from "next/server";
import db from "@/providers/database";
import { fetchJerpUser } from "@/shared/services/jerp";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inscription: string | undefined = body?.inscription?.toString().trim();
    if (!inscription) return NextResponse.json({ error: "Inscrição é obrigatória" }, { status: 400 });

    const local = await db.user.findUnique({ where: { inscription } });
    if (local) {
      return NextResponse.json({ status: "LOCAL" });
    }

    const jerp = await fetchJerpUser(inscription);
    if (jerp) {
      return NextResponse.json({ status: "JERP", user: jerp });
    }

    return NextResponse.json({ error: "usuario não encontrado no sistema interno, contacre o suporte" }, { status: 404 });
  } catch (e) {
    console.error("[INSCRICAO_LOGIN]", e);
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }
}

