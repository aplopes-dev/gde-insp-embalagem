import { NextRequest, NextResponse } from "next/server";
import db from "@/providers/database";
import { requireRole } from "@/lib/rbac";
import type { DetectionStatus, Prisma } from "@prisma/client";

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
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
  const detectionStatus = searchParams.get(
    "detectionStatus"
  ) as DetectionStatus | null;

  const where: Prisma.InspectionImageWhereInput = {
    opId,
    ...(detectionStatus ? { detectionStatus } : {}),
  };

  const [total, data] = await Promise.all([
    db.inspectionImage.count({ where }),
    db.inspectionImage.findMany({
      where,
      orderBy: { capturedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}
