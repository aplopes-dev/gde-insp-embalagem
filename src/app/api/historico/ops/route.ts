import { NextRequest, NextResponse } from "next/server";
import db from "@/providers/database";
import { requireRole } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const gate = await requireRole(["AUDITOR"]);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status")?.trim();

  const where = {
    ...(status ? { status: status as "PENDING" | "COMPLETED" } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" as const } },
            ...(Number.isFinite(Number(q)) ? [{ id: Number(q) }] : []),
          ],
        }
      : {}),
  };

  const [total, ops] = await Promise.all([
    db.op.count({ where }),
    db.op.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: { select: { name: true, code: true } },
        _count: {
          select: { OpOccurrences: true, InspectionImages: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    data: ops,
    total,
    page,
    limit,
  });
}
