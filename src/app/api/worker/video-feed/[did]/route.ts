import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}

// GET — proxia o stream MJPEG do worker Flask para o browser
// Evita expor o worker diretamente; exige NextAuth
export async function GET(
  req: NextRequest,
  { params }: { params: { did: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const workerUrl = process.env.WORKER_EXTERNAL_URL;
  const workerPort = process.env.WORKER_EXTERNAL_PORT ?? "5010";

  if (!workerUrl) {
    return NextResponse.json(
      { error: "WORKER_EXTERNAL_URL não configurado" },
      { status: 503 }
    );
  }

  const upstreamUrl = `http://${workerUrl}:${workerPort}/video_feed/${params.did}`;

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
