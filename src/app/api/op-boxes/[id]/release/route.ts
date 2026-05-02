import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";

const LOCK_TIMEOUT_MS =
  parseInt(process.env.OPBOX_LOCK_TIMEOUT_MINUTES ?? "10") * 60 * 1000;

function unauthorized() {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}

// PUT — libera o lock assignedDeviceId/assignedAt de uma OpBox
// Permitido para: SUPERVISOR (qualquer box) ou device owner (lock já expirado)
export async function PUT(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const role = (session.user as any).role as string;

  const opBox = await db.opBox.findUnique({
    where: { id: params.id },
    select: { id: true, assignedDeviceId: true, assignedAt: true, status: true },
  });

  if (!opBox) {
    return NextResponse.json({ error: "OpBox não encontrada" }, { status: 404 });
  }

  if (!opBox.assignedDeviceId) {
    return NextResponse.json({ error: "OpBox não está bloqueada" }, { status: 409 });
  }

  const lockExpired =
    !opBox.assignedAt ||
    Date.now() - opBox.assignedAt.getTime() > LOCK_TIMEOUT_MS;

  // Apenas SUPERVISOR pode liberar lock ativo; qualquer autenticado libera lock expirado
  if (!lockExpired && role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Sem permissão para liberar lock ativo" }, { status: 403 });
  }

  await db.opBox.update({
    where: { id: params.id },
    data: { assignedDeviceId: null, assignedAt: null },
  });

  return NextResponse.json({ ok: true });
}
