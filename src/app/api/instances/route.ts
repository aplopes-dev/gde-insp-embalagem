import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

// Lista instâncias lendo os .env montados em /host/instances (bind do host)
export async function GET() {
  try {
    const base = "/host/instances";
    const ip = process.env.SERVER_HOST_IP || "localhost";
    if (!fs.existsSync(base)) return NextResponse.json({ instances: [] });

    const entries = fs.readdirSync(base, { withFileTypes: true });
    const instances = entries
      .filter((e) => e.isDirectory())
      .map((e) => path.join(base, e.name, ".env"))
      .filter((f) => fs.existsSync(f))
      .map((envPath) => {
        const content = fs.readFileSync(envPath, "utf-8");
        const vars = Object.fromEntries(
          content
            .split(/\r?\n/)
            .filter((l) => l.includes("="))
            .map((l) => {
              const [k, ...rest] = l.split("=");
              return [k.trim(), rest.join("=").trim()];
            })
        ) as any;
        const instanceId = vars["INSTANCE_ID"];
        const fport = vars["FRONTEND_EXTERNAL_PORT"];
        const dport = vars["DETECTOR_EXTERNAL_PORT"];
        if (!instanceId || !fport || !dport) return null;
        return {
          instanceId,
          frontUrl: `http://${ip}:${fport}`,
          videoUrl: `http://${ip}:${dport}/video_feed`,
          statsUrl: `http://${ip}:${dport}/stats`,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ instances });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

