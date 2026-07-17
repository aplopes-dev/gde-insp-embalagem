import { NextRequest, NextResponse } from "next/server";
import db from "@/providers/database";
import { requireRole } from "@/lib/rbac";
import type { ActivityActionType, DetectionStatus, Prisma } from "@prisma/client";

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

  const op = await db.op.findUnique({ where: { id: opId }, select: { id: true } });
  if (!op) {
    return NextResponse.json({ error: "OP não encontrada" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 50)));
  const actionType = searchParams.get("actionType") as ActivityActionType | null;
  const detectionStatus = searchParams.get(
    "detectionStatus"
  ) as DetectionStatus | null;
  const boxId = searchParams.get("boxId")?.trim();
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const parsedFrom = dateFrom ? new Date(dateFrom) : null;
  const parsedTo = dateTo ? new Date(dateTo) : null;
  if (
    (parsedFrom && Number.isNaN(parsedFrom.getTime())) ||
    (parsedTo && Number.isNaN(parsedTo.getTime()))
  ) {
    return NextResponse.json(
      { error: "Parâmetros dateFrom/dateTo inválidos" },
      { status: 400 }
    );
  }

  const where: Prisma.OpActivityLogWhereInput = {
    opId,
    ...(actionType ? { actionType } : {}),
    ...(detectionStatus ? { detectionStatus } : {}),
    ...(boxId ? { boxId } : {}),
    ...(parsedFrom || parsedTo
      ? {
          createdAt: {
            ...(parsedFrom ? { gte: parsedFrom } : {}),
            ...(parsedTo ? { lte: parsedTo } : {}),
          },
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    db.opActivityLog.count({ where }),
    db.opActivityLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}
