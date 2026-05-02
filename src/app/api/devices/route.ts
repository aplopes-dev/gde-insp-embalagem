import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";

function getConfiguredDevices(): string[] {
  return (process.env.REALWEAR_DEVICES ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

function unauthorized() {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}

// GET — lista devices configurados com estado de sessão (LIVRE | AGUARDANDO_QR | EM_OPERACAO)
// OFFLINE é inferido pelo cliente via evento WebSocket DEVICE_OFFLINE (não persiste em DB)
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const deviceIds = getConfiguredDevices();

  const [sessions, assignments] = await Promise.all([
    db.deviceSession.findMany({
      where: { deviceId: { in: deviceIds } },
      select: {
        deviceId: true,
        activatedAt: true,
        qrExpiresAt: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.opBox.findMany({
      where: { assignedDeviceId: { in: deviceIds }, status: "PENDING" },
      select: { opId: true, assignedDeviceId: true },
      distinct: ["assignedDeviceId"],
      orderBy: { assignedAt: "desc" },
    }),
  ]);

  const sessionByDevice = new Map(sessions.map((s) => [s.deviceId, s]));
  const opByDevice = new Map(
    assignments.map((a) => [a.assignedDeviceId as string, a.opId])
  );

  const devices = deviceIds.map((did) => {
    const s = sessionByDevice.get(did);
    return {
      deviceId: did,
      status: s?.activatedAt ? "EM_OPERACAO" : s ? "AGUARDANDO_QR" : "LIVRE",
      session: s ?? null,
      currentOpId: opByDevice.get(did) ?? null,
    };
  });

  return NextResponse.json(devices);
}
