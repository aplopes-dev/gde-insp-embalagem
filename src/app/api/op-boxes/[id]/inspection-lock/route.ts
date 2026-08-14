import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import {
  releaseOpBoxInspectionLock,
  renewOpBoxInspectionLock,
} from "@/usecases/op/claim-next-pending-op-box";
import { NextRequest, NextResponse } from "next/server";

type LockBody = {
  action?: "renew" | "release";
};

/**
 * Heartbeat / liberação do lock da caixa.
 * renew: inspeção da OP carregada; release: tela deixou de estar carregada.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const opBoxId = params.id?.trim();
  if (!opBoxId) {
    return NextResponse.json({ error: "boxId em falta" }, { status: 400 });
  }

  let action: "renew" | "release" = "renew";
  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text) as LockBody;
      if (body?.action === "release" || body?.action === "renew") {
        action = body.action;
      }
    }
  } catch {
    /* body vazio ou inválido → renew */
  }

  if (action === "release") {
    await releaseOpBoxInspectionLock(opBoxId, userId);
    return NextResponse.json({ ok: true });
  }

  const ok = await renewOpBoxInspectionLock(opBoxId, userId);
  return NextResponse.json({ ok });
}
