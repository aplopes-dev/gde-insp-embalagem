import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}

function parseWorkerDeviceMap(): Record<string, string> {
  const raw = (process.env.WORKER_DEVICE_MAP ?? "").trim();
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === "string" && typeof v === "string" && v.trim() !== "") {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function parseHostPort(rawUrl: string): { host: string; port: string } | null {
  try {
    const parsed = new URL(rawUrl);
    const host =
      parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost"
        ? "host.docker.internal"
        : parsed.hostname;
    const port = parsed.port || "5000";
    return { host, port };
  } catch {
    return null;
  }
}

function resolveWorkerEndpoint(deviceId: string): { host: string; port: string } {
  const fromMap = parseWorkerDeviceMap()[deviceId];
  if (fromMap) {
    const hp = parseHostPort(fromMap);
    if (hp) return hp;
  }

  const explicitHost = (process.env.WORKER_EXTERNAL_URL ?? "").trim();
  const explicitPort = (process.env.WORKER_EXTERNAL_PORT ?? "").trim();
  if (explicitHost) return { host: explicitHost, port: explicitPort || "5000" };

  const guiUrl = (process.env.WORKER_GUI_URL ?? "").trim();
  if (guiUrl) {
    const hp = parseHostPort(guiUrl);
    if (hp) return hp;
  }

  // Fallback padrão para worker no host (compose já injeta host.docker.internal)
  return { host: "host.docker.internal", port: "5000" };
}

// GET — proxia o stream MJPEG do worker Flask para o browser
// Evita expor o worker diretamente; exige NextAuth
export async function GET(
  req: NextRequest,
  { params }: { params: { did: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const { host, port } = resolveWorkerEndpoint(params.did);
  const upstreamUrl = `http://${host}:${port}/video_feed/${params.did}`;

  // Propaga o abort do cliente para o fetch upstream
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());

  try {
    const upstream = await fetch(upstreamUrl, {
      signal: abort.signal,
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Worker não disponível" },
        { status: upstream.status || 502 }
      );
    }

    const contentType =
      upstream.headers.get("Content-Type") ?? "multipart/x-mixed-replace; boundary=frame";

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Accel-Buffering": "no",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    return NextResponse.json({ error: "Worker inacessível" }, { status: 502 });
  }
}
