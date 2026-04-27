import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";
import { nestPostActivityLog, useGdeApi } from "@/libs/gde-api";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const opId = parseInt(params.id);
    const body = await req.json();

    const { actionType, description, details, boxId, productId } = body;

    if (!actionType || !description) {
      return NextResponse.json(
        { error: "actionType e description são obrigatórios" },
        { status: 400 }
      );
    }

    if (useGdeApi()) {
      try {
        const activityLog = await nestPostActivityLog(
          params.id,
          { actionType, description, details, boxId, productId },
          user.id,
        );
        return NextResponse.json(activityLog, { status: 201 });
      } catch (e: any) {
        const msg = e?.message || "Erro ao registrar ação";
        const status = msg.includes("não encontrada") ? 404 : 400;
        return NextResponse.json({ error: msg }, { status });
      }
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

