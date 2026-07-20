import { NextRequest, NextResponse } from "next/server";
import db from "@/providers/database";
import { requireRole } from "@/lib/rbac";
import { createOccurrence } from "@/usecases/occurrence/create-occurrence";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requireRole(["SUPERVISOR"]);
  if (!gate.ok) return gate.response;

  const opId = Number.parseInt(params.id, 10);
  if (Number.isNaN(opId)) {
    return NextResponse.json({ error: "OP inválida" }, { status: 400 });
  }

  const data = await db.opOccurrence.findMany({
    where: { opId },
    include: {
      responsible: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
      _count: { select: { activities: true, images: true } },
    },
    orderBy: { number: "asc" },
  });

  return NextResponse.json({ data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requireRole(["SUPERVISOR"]);
  if (!gate.ok) return gate.response;

  const opId = Number.parseInt(params.id, 10);
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

  const op = await db.op.findUnique({ where: { id: opId }, select: { id: true } });
  if (!op) {
    return NextResponse.json({ error: "OP não encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const boxId = body.boxId ? String(body.boxId) : null;
  const responsibleId = body.responsibleId
    ? String(body.responsibleId)
    : null;

  if (!title || !description) {
    return NextResponse.json(
      { error: "title e description são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const created = await createOccurrence({
      opId,
      title,
      description,
      openedByUserId: user.id,
      responsibleId,
      boxId,
      details: {
        source: "manual_supervisor",
        boxId,
      },
    });

    const full = await db.opOccurrence.findUnique({
      where: { id: created.id },
      include: {
        responsible: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ data: full }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar ocorrência:", error);
    return NextResponse.json(
      { error: "Erro ao criar ocorrência" },
      { status: 500 }
    );
  }
}
