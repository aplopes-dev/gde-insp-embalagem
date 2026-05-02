import { NextRequest, NextResponse } from "next/server";
import db from "@/providers/database";

// PUT — validação do QR pelo app mobile (rota pública, sem NextAuth)
export async function PUT(
  req: NextRequest,
  { params }: { params: { did: string } }
) {
  let body: { qrToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { qrToken } = body;
  if (!qrToken) {
    return NextResponse.json({ error: "qrToken obrigatório" }, { status: 400 });
  }

  const deviceSession = await db.deviceSession.findUnique({
    where: { deviceId: params.did },
  });

  if (!deviceSession) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  }

  if (deviceSession.qrToken !== qrToken) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  if (deviceSession.activatedAt) {
    return NextResponse.json({ error: "Sessão já ativada" }, { status: 409 });
  }

  if (deviceSession.qrExpiresAt < new Date()) {
    return NextResponse.json({ error: "QR expirado" }, { status: 410 });
  }

  const updated = await db.deviceSession.update({
    where: { deviceId: params.did },
    data: { activatedAt: new Date() },
    select: {
      id: true,
      deviceId: true,
      userId: true,
      activatedAt: true,
    },
  });

  return NextResponse.json(updated);
}
