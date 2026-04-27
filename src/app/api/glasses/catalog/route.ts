import { authOptions } from "@/libs/auth";
import { parseGlassesCatalogFromEnv } from "@/shared/glasses-catalog";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const raw = process.env.GLASSES_CATALOG_JSON;
  const items = parseGlassesCatalogFromEnv(raw).map(({ deviceId, label }) => ({
    deviceId,
    label,
  }));

  return NextResponse.json({ items });
}
