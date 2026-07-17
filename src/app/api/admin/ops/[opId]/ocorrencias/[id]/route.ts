import { NextRequest, NextResponse } from "next/server";
import db from "@/providers/database";
import { requireRole } from "@/lib/rbac";
import {
  closeOccurrence,
  updateOccurrence,
} from "@/usecases/occurrence/close-occurrence";

export async function GET(
  _req: NextRequest,
  { params }: { params: { opId: string; id: string } }
) {
  const gate = await requireRole(["SUPERVISOR"]);
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { opId: string; id: string } }
) {
  const gate = await requireRole(["SUPERVISOR"]);
  if (!gate.ok) return gate.response;

  const opId = Number.parseInt(params.opId, 10);
  if (Number.isNaN(opId)) {
    return NextResponse.json({ error: "OP inválida" }, { status: 400 });
  }

  const user =
    (gate.email &&
      (await db.user.findUnique({ where: { email: gate.email } }))) ||
    (gate.userId &&
      (await db.user.findUnique({ where: { id: gate.userId } })));

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const action = String(body.action || "update");

  try {
    if (action === "close") {
      await closeOccurrence({
        occurrenceId: params.id,
        opId,
        closedByUserId: user.id,
        resolution: String(body.resolution || ""),
      });
    } else {
      await updateOccurrence({
        occurrenceId: params.id,
        opId,
        updatedByUserId: user.id,
        title: body.title,
        description: body.description,
        status: body.status,
        responsibleId: body.responsibleId,
        resolution: body.resolution,
      });
    }

    const full = await db.opOccurrence.findFirst({
      where: { id: params.id, opId },
      include: {
        responsible: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ data: full });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar ocorrência";
    const status =
      message.includes("não encontrada") ||
      message.includes("já está") ||
      message.includes("Resolução")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
