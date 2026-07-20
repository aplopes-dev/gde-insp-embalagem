import { NextRequest, NextResponse } from "next/server";
import db from "@/providers/database";
import { requireRole } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

function buildOpWhere(
  q: string | undefined,
  status: string | undefined
): Prisma.OpWhereInput {
  const where: Prisma.OpWhereInput = {};

  if (status === "PENDING" || status === "COMPLETED") {
    where.status = status;
  }

  if (q) {
    const or: Prisma.OpWhereInput[] = [
      { code: { equals: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
    ];
    if (/^\d+$/.test(q)) {
      const id = Number.parseInt(q, 10);
      if (Number.isFinite(id)) or.push({ id });
    }
    where.OR = or;
  }

  return where;
}

export async function GET(req: NextRequest) {
  const gate = await requireRole(["AUDITOR"]);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") || 20))
  );
  const q = searchParams.get("q")?.trim() || undefined;
  const status = searchParams.get("status")?.trim() || undefined;

  const where = buildOpWhere(q, status);

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
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
