"use client";

import QRCode from "react-qr-code";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import { Loader2 } from "lucide-react";

interface Props {
  deviceId: string;
  qrToken: string;
  qrExpiresAt: string; // ISO string
}

export default function SelectClient({ deviceId, qrToken, qrExpiresAt }: Props) {
  const router = useRouter();
  const expiresAt = new Date(qrExpiresAt).getTime();

  const remaining = () => Math.max(0, Math.round((expiresAt - Date.now()) / 1000));

  const [secondsLeft, setSecondsLeft] = useState(remaining);
  const [expired, setExpired] = useState(() => remaining() === 0);
  const [generating, setGenerating] = useState(false);

  // O app RealWear lê este JSON do QR e valida device_id antes de chamar /activate
  const qrPayload = JSON.stringify({ device_id: deviceId, token: qrToken });

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (expired) return;

    const t = setInterval(() => {
      const left = remaining();
      setSecondsLeft(left);
      if (left === 0) {
        setExpired(true);
        clearInterval(t);
      }
    }, 1000);

    return () => clearInterval(t);
  }, [expired, expiresAt]);

  // ── Polling de ativação (a cada 2 s) ─────────────────────────────────────
  useEffect(() => {
    if (expired) return;

    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/device/${deviceId}/session`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.activatedAt) {
          clearInterval(t);
          router.push(`/?deviceId=${encodeURIComponent(deviceId)}`);
        }
      } catch {
        // ignora erros de rede — próxima iteração tenta novamente
      }
    }, 2000);

    return () => clearInterval(t);
  }, [deviceId, expired, router]);

  // ── Gerar novo QR ─────────────────────────────────────────────────────────
  async function handleNewQR() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/device/${deviceId}/session`, { method: "POST" });
      if (res.ok || res.status === 201) {
        // router.refresh() re-executa o server component com a nova sessão
        router.refresh();
        setExpired(false);
      }
    } finally {
      setGenerating(false);
    }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Ativar dispositivo
          </h1>
          <p className="mt-1 text-sm font-mono text-gray-500 dark:text-gray-400">
            {deviceId}
          </p>
        </div>

        {!expired ? (
          <>
            {/* QR Code */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <QRCode value={qrPayload} size={240} />
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
              Abra o app no RealWear, aponte para o QR code e aguarde a validação.
            </p>

            {/* Countdown */}
            <div className="flex flex-col items-center gap-1">
              <span
                className={`text-5xl font-mono font-bold tabular-nums ${
                  secondsLeft <= 10
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-800 dark:text-gray-100"
                }`}
              >
                {mm}:{ss}
              </span>
              <span className="text-xs text-gray-400">QR expira em {secondsLeft} s</span>
            </div>

            {/* Indicador de polling */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Aguardando ativação…
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                QR expirado
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Gere um novo código para continuar.
              </p>
            </div>

            <Button onClick={handleNewQR} disabled={generating} className="gap-2">
              {generating && <Loader2 className="w-4 h-4 animate-spin" />}
              Gerar novo QR
            </Button>
          </div>
        )}

        <Link href="/dashboard">
          <Button variant="ghost" className="text-sm text-gray-500">
            ← Voltar
          </Button>
        </Link>
      </div>
    </div>
  );
}
