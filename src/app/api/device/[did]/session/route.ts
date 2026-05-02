import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";
import { randomUUID } from "crypto";

const QR_TTL_SECONDS = parseInt(process.env.DEVICE_SESSION_QR_TTL_SECONDS ?? "60");
const SESSION_MAX_INACTIVE_MINUTES = parseInt(
  process.env.DEVICE_SESSION_INACTIVITY_TIMEOUT_MINUTES ?? "30"
);

function getConfiguredDevices(): string[] {
  return (process.env.REALWEAR_DEVICES ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

function unauthorized() {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}

// GET — estado da sessão; usado pela página /device/[did]/select para detectar ativação
export async function GET(
  _req: NextRequest,
  { params }: { params: { did: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const deviceSession = await db.deviceSession.findUnique({
    where: { deviceId: params.did },
    select: {
      id: true,
      deviceId: true,
      userId: true,
      activatedAt: true,
      qrExpiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(deviceSession ?? null);
}

// POST — cria DeviceSession com token QR one-shot
export async function POST(
  _req: NextRequest,
  { params }: { params: { did: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const userId = (session.user as any).id as string;
  const { did } = params;

  if (!getConfiguredDevices().includes(did)) {
    return NextResponse.json({ error: "Device não configurado" }, { status: 404 });
  }

  const existing = await db.deviceSession.findUnique({ where: { deviceId: did } });

  if (existing?.activatedAt) {
    const inactiveMs = SESSION_MAX_INACTIVE_MINUTES * 60 * 1000;
    const sessionAge = Date.now() - existing.activatedAt.getTime();
    if (sessionAge < inactiveMs) {
      return NextResponse.json({ error: "Device em operação" }, { status: 409 });
    }
    // Sessão expirada por inatividade (ex: óculos caiu sem DELETE) — substituir
    await db.deviceSession.delete({ where: { deviceId: did } });
  } else if (existing) {
    // QR pendente (não escaneado) — substituir pelo novo
    await db.deviceSession.delete({ where: { deviceId: did } });
  }

  const qrExpiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000);

  const deviceSession = await db.deviceSession.create({
    data: {
      deviceId: did,
      userId,
      qrToken: randomUUID(),
      qrExpiresAt,
    },
  });

  return NextResponse.json(
    {
      id: deviceSession.id,
      deviceId: deviceSession.deviceId,
      qrToken: deviceSession.qrToken,
      qrExpiresAt: deviceSession.qrExpiresAt,
    },
    { status: 201 }
  );
}

// DELETE — encerra sessão; libera locks de OpBox do device
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { did: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as string;

  const deviceSession = await db.deviceSession.findUnique({
    where: { deviceId: params.did },
  });

  if (!deviceSession) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  }

  if (deviceSession.userId !== userId && role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await db.$transaction([
    db.opBox.updateMany({
      where: { assignedDeviceId: params.did },
      data: { assignedDeviceId: null, assignedAt: null },
    }),
    db.deviceSession.delete({ where: { deviceId: params.did } }),
  ]);

  return NextResponse.json({ ok: true });
}
