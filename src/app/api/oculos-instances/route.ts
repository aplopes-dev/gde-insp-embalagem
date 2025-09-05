import db from "@/providers/database";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const where: any = {};
    if (status === "ATIVO") where.status = "ATIVO";
    const data = await db.oculosInstance.findMany({
      where,
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, referencia: true, status: true },
    });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

