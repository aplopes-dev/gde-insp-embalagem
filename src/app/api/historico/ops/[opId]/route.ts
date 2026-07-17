import { NextResponse } from "next/server";
import db from "@/providers/database";
import { requireRole } from "@/lib/rbac";

export async function GET(
  _req: Request,
  { params }: { params: { opId: string } }
) {
  const gate = await requireRole(["AUDITOR"]);
  if (!gate.ok) return gate.response;

  const opId = Number.parseInt(params.opId, 10);
  if (Number.isNaN(opId)) {
    return NextResponse.json({ error: "OP inválida" }, { status: 400 });
  }

  const op = await db.op.findUnique({
    where: { id: opId },
    include: {
      product: true,
      box: true,
      blister: true,
      _count: {
        select: {
          OpOccurrences: true,
          InspectionImages: true,
          OpBox: true,
        },
      },
    },
  });

  if (!op) {
    return NextResponse.json({ error: "OP não encontrada" }, { status: 404 });
  }

  const activityCount = await db.opActivityLog.count({ where: { opId } });
  const alertCount = await db.opActivityLog.count({
    where: {
      opId,
      OR: [
        { actionType: "DETECTION_INVALID" },
        { actionType: "DETECTION_TIMEOUT" },
        { detectionStatus: { in: ["INVALID", "TIMEOUT"] } },
      ],
    },
  });

  return NextResponse.json({
    data: {
      ...op,
      stats: {
        activityCount,
        alertCount,
        occurrenceCount: op._count.OpOccurrences,
        imageCount: op._count.InspectionImages,
        boxCount: op._count.OpBox,
      },
    },
  });
}
