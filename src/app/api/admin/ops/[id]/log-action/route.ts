import { NextRequest, NextResponse } from "next/server";
import db from "@/providers/database";
import { requireRole } from "@/lib/rbac";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gate = await requireRole(["OPERADOR", "SUPERVISOR", "AUDITOR"]);
    if (!gate.ok) return gate.response;

    const user = gate.email
      ? await db.user.findUnique({ where: { email: gate.email } })
      : gate.userId
        ? await db.user.findUnique({ where: { id: gate.userId } })
        : null;

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const opId = parseInt(params.id, 10);
    if (Number.isNaN(opId)) {
      return NextResponse.json({ error: "OP inválida" }, { status: 400 });
    }

    const body = await req.json();

    const {
      actionType,
      description,
      details,
      boxId,
      productId,
      occurrenceId,
      detectionStatus,
      imageFilename,
      storagePath,
      confidence,
      deviceId,
    } = body;

    if (!actionType || !description) {
      return NextResponse.json(
        { error: "actionType e description são obrigatórios" },
        { status: 400 }
      );
    }

    const op = await db.op.findUnique({
      where: { id: opId },
    });

    if (!op) {
      return NextResponse.json(
        { error: "OP não encontrada" },
        { status: 404 }
      );
    }

    const activityLog = await db.opActivityLog.create({
      data: {
        opId,
        userId: user.id,
        actionType,
        description,
        details: details || null,
        boxId: boxId || null,
        productId: productId || null,
        occurrenceId: occurrenceId || null,
        detectionStatus: detectionStatus || null,
        imageFilename: imageFilename || null,
        storagePath: storagePath || null,
        confidence: confidence ?? null,
        deviceId: deviceId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(activityLog, { status: 201 });
  } catch (error) {
    console.error("Erro ao registrar ação:", error);
    return NextResponse.json(
      { error: "Erro ao registrar ação" },
      { status: 500 }
    );
  }
}
