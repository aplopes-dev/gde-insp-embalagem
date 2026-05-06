"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import { getSocket } from "@/libs/socket";
import { Loader2, Monitor, Power, VideoOff } from "lucide-react";

type SessionInfo = {
  deviceId: string;
  activatedAt: string | null;
  qrExpiresAt: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

type APIDevice = {
  deviceId: string;
  status: "LIVRE" | "AGUARDANDO_QR" | "EM_OPERACAO";
  session: SessionInfo | null;
  currentOpId: number | null;
};

type DeviceState = APIDevice & { offline: boolean };

const STATUS_LABEL: Record<string, string> = {
  LIVRE: "Livre",
  AGUARDANDO_QR: "Aguardando QR",
  EM_OPERACAO: "Em Operação",
  OFFLINE: "Offline",
};

const STATUS_CLASS: Record<string, string> = {
  LIVRE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
  AGUARDANDO_QR: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
  EM_OPERACAO: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  OFFLINE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
};

interface Props {
  currentUserId: string;
  currentUserRole: string;
}

export default function DashboardClient({ currentUserId, currentUserRole }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [devices, setDevices] = useState<DeviceState[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<Record<string, boolean>>({});

  // Kept in a ref so socket handlers always see the latest value without re-subscribing
  const offlineRef = useRef<Record<string, boolean>>({});
  const devicesRef = useRef<DeviceState[]>([]);
  useEffect(() => { devicesRef.current = devices; }, [devices]);

  // ── Polling ──────────────────────────────────────────────────────────────
  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/devices");
      if (!res.ok) return;
      const data: APIDevice[] = await res.json();
      setDevices(
        data.map((d) => ({ ...d, offline: offlineRef.current[d.deviceId] ?? false }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    const t = setInterval(fetchDevices, 5000);
    return () => clearInterval(t);
  }, [fetchDevices]);

  // ── from_gui: GUI Flask abre /dashboard?from_gui=1&deviceId=... ───────────
  // Cria e ativa a DeviceSession silenciosamente, sem exibir QR.
  useEffect(() => {
    const fromGui = searchParams.get("from_gui");
    const deviceId = searchParams.get("deviceId");
    if (fromGui !== "1" || !deviceId) return;

    (async () => {
      try {
        const createRes = await fetch(`/api/device/${deviceId}/session`, { method: "POST" });
        if (createRes.ok) {
          const { qrToken } = await createRes.json();
          const activateRes = await fetch(`/api/device/${deviceId}/session/activate`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qrToken }),
          });
          if (!activateRes.ok && activateRes.status !== 409) {
            console.error("[from_gui] Falha ao ativar sessão:", activateRes.status);
          }
        }
      } catch (err) {
        console.error("[from_gui] Erro ao criar sessão:", err);
      } finally {
        router.replace("/dashboard");
        fetchDevices();
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WebSocket ─────────────────────────────────────────────────────────────
  // Join all device rooms once on mount; listen for DEVICE_OFFLINE / heartbeat
  useEffect(() => {
    const socket = getSocket();
    const joined = new Set<string>();

    function joinAll() {
      devicesRef.current.forEach(({ deviceId }) => {
        if (!joined.has(deviceId)) {
          socket.emit("joinDevice", { device_id: deviceId });
          joined.add(deviceId);
        }
      });
    }

    if (socket.connected) joinAll();
    socket.on("connect", joinAll);

    const onOffline = ({ deviceId }: { deviceId: string }) => {
      offlineRef.current[deviceId] = true;
      setDevices((prev) =>
        prev.map((d) => (d.deviceId === deviceId ? { ...d, offline: true } : d))
      );
    };

    const onHeartbeat = ({ device_id }: { device_id: string }) => {
      offlineRef.current[device_id] = false;
      setDevices((prev) =>
        prev.map((d) => (d.deviceId === device_id ? { ...d, offline: false } : d))
      );
    };

    socket.on("DEVICE_OFFLINE", onOffline);
    socket.on("heartbeat", onHeartbeat);

    return () => {
      joined.forEach((did) => socket.emit("leaveDevice", { device_id: did }));
      socket.off("connect", joinAll);
      socket.off("DEVICE_OFFLINE", onOffline);
      socket.off("heartbeat", onHeartbeat);
    };
  }, []); // once — joinAll reads devicesRef dynamically

  // Join rooms that arrive after first render (initial fetch populates devicesRef)
  useEffect(() => {
    if (devices.length === 0) return;
    const socket = getSocket();
    if (socket.connected) {
      devices.forEach(({ deviceId }) => socket.emit("joinDevice", { device_id: deviceId }));
    }
  }, [devices.length]); // re-run only when number of devices changes

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleSelect(deviceId: string) {
    setBusy(deviceId);
    try {
      const res = await fetch(`/api/device/${deviceId}/session`, { method: "POST" });
      if (res.status === 201) {
        router.push(`/device/${deviceId}/select`);
        return;
      }
      await fetchDevices();
    } finally {
      setBusy(null);
    }
  }

  async function handleEnd(deviceId: string) {
    setBusy(deviceId);
    try {
      await fetch(`/api/device/${deviceId}/session`, { method: "DELETE" });
      await fetchDevices();
    } finally {
      setBusy(null);
    }
  }

  function displayStatus(d: DeviceState) {
    return d.offline ? "OFFLINE" : d.status;
  }

  function canEnd(d: DeviceState) {
    if (!d.session) return false;
    return currentUserRole === "SUPERVISOR" || d.session.user.id === currentUserId;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dispositivos
          </h1>
          <span className="text-xs text-gray-400">atualiza a cada 5 s</span>
        </div>

        {devices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
              Nenhum device configurado em{" "}
              <code className="font-mono text-sm">REALWEAR_DEVICES</code>.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {devices.map((d) => {
              const status = displayStatus(d);
              const processing = busy === d.deviceId;

              return (
                <Card key={d.deviceId} className="flex flex-col overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm font-mono truncate">
                        {d.deviceId}
                      </CardTitle>
                      <span
                        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                          STATUS_CLASS[status] ?? STATUS_CLASS.OFFLINE
                        }`}
                      >
                        {STATUS_LABEL[status] ?? status}
                      </span>
                    </div>
                    {d.session && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {d.session.user.name}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="flex flex-col gap-3 flex-1">
                    {/* Video feed */}
                    <div className="relative bg-black rounded-md overflow-hidden aspect-video">
                      {!videoError[d.deviceId] ? (
                        <img
                          key={d.deviceId}
                          src={`/api/worker/video-feed/${d.deviceId}`}
                          alt={`Feed ${d.deviceId}`}
                          className="w-full h-full object-contain"
                          onError={() =>
                            setVideoError((prev) => ({ ...prev, [d.deviceId]: true }))
                          }
                        />
                      ) : (
                        <button
                          className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
                          onClick={() =>
                            setVideoError((prev) => ({ ...prev, [d.deviceId]: false }))
                          }
                          title="Clique para tentar reconectar"
                        >
                          <VideoOff className="w-8 h-8" />
                          <span className="text-xs">Sem sinal — clique para tentar</span>
                        </button>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-auto">
                      {status === "LIVRE" && (
                        <Button
                          className="flex-1"
                          onClick={() => handleSelect(d.deviceId)}
                          disabled={processing}
                        >
                          {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          Selecionar
                        </Button>
                      )}

                      {status === "AGUARDANDO_QR" && (
                        <>
                          <Button variant="outline" className="flex-1" disabled>
                            Aguardando QR…
                          </Button>
                          {canEnd(d) && (
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleEnd(d.deviceId)}
                              disabled={processing}
                              title="Cancelar sessão"
                            >
                              {processing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Power className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </>
                      )}

                      {(status === "EM_OPERACAO" || status === "OFFLINE") && (
                        <>
                          {d.currentOpId &&
                          (currentUserRole === "SUPERVISOR" ||
                            d.session?.user.id === currentUserId) ? (
                            <Link
                              href={`/op/${d.currentOpId}?deviceId=${d.deviceId}`}
                              className="flex-1"
                            >
                              <Button variant="outline" className="w-full gap-2">
                                <Monitor className="w-4 h-4" />
                                Acompanhar
                              </Button>
                            </Link>
                          ) : (
                            <Button variant="outline" className="flex-1 gap-2" disabled>
                              <Monitor className="w-4 h-4" />
                              Em Operação
                            </Button>
                          )}

                          {canEnd(d) && (
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleEnd(d.deviceId)}
                              disabled={processing}
                              title="Encerrar sessão"
                            >
                              {processing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Power className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
