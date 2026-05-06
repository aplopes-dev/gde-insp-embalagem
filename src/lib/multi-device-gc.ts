import db from "@/providers/database";

/**
 * Expira locks de OpBox antigos e sessões de device inativas (GC lazy).
 * Chamado em rotas que já são consultadas periodicamente (ex.: GET /api/devices).
 */
export async function garbageCollectExpiredLocksAndSessions(): Promise<void> {
  const lockTimeoutMs =
    parseInt(process.env.OPBOX_LOCK_TIMEOUT_MINUTES ?? "10", 10) * 60 * 1000;

  await db.opBox.updateMany({
    where: {
      assignedDeviceId: { not: null },
      packedAt: null,
      assignedAt: { lt: new Date(Date.now() - lockTimeoutMs) },
    },
    data: { assignedDeviceId: null, assignedAt: null },
  });

  const inactiveMs =
    parseInt(process.env.DEVICE_SESSION_INACTIVITY_TIMEOUT_MINUTES ?? "30", 10) *
    60 *
    1000;

  const expiredSessions = await db.deviceSession.findMany({
    where: {
      activatedAt: { lt: new Date(Date.now() - inactiveMs) },
    },
    select: { deviceId: true },
  });

  if (expiredSessions.length === 0) return;

  const ids = expiredSessions.map((s) => s.deviceId);
  await db.$transaction([
    db.opBox.updateMany({
      where: { assignedDeviceId: { in: ids } },
      data: { assignedDeviceId: null, assignedAt: null },
    }),
    db.deviceSession.deleteMany({ where: { deviceId: { in: ids } } }),
  ]);
}
