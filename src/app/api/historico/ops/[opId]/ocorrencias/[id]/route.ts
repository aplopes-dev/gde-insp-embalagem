import { NextResponse } from "next/server";
import db from "@/providers/database";
import { requireRole } from "@/lib/rbac";

export async function GET(
  _req: Request,
  { params }: { params: { opId: string; id: string } }
) {
  const gate = await requireRole(["AUDITOR"]);
  if (!gate.ok) return gate.response;

  const opId = Number.parseInt(params.opId, 10);
  if (Number.isNaN(opId)) {
    return NextResponse.json({ error: "OP inválida" }, { status: 400 });
  }

  const data = await db.opOccurrence.findFirst({
    where: { id: params.id, opId },
    include: {
      responsible: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
      activities: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      },
      images: { orderBy: { capturedAt: "desc" } },
    },
  });

  if (!data) {
    return NextResponse.json({ error: "Ocorrência não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data });
}
