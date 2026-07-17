import { NextRequest, NextResponse } from "next/server";
import db from "@/providers/database";
import { requireRole } from "@/lib/rbac";
import type { OccurrenceStatus, Prisma } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { opId: string } }
) {
  const gate = await requireRole(["AUDITOR"]);
  if (!gate.ok) return gate.response;

  const opId = Number.parseInt(params.opId, 10);
  if (Number.isNaN(opId)) {
    return NextResponse.json({ error: "OP inválida" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as OccurrenceStatus | null;

  const where: Prisma.OpOccurrenceWhereInput = {
    opId,
    ...(status ? { status } : {}),
  };

  const data = await db.opOccurrence.findMany({
    where,
    include: {
      responsible: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
      _count: { select: { activities: true, images: true } },
    },
    orderBy: { number: "asc" },
  });

  return NextResponse.json({ data });
}
