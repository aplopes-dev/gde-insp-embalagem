import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";

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

    // Validar campos obrigatórios
    if (!actionType || !description) {
      return NextResponse.json(
        { error: "actionType e description são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se a OP existe
    const op = await db.op.findUnique({
      where: { id: opId },
    });

    if (!op) {
      return NextResponse.json(
        { error: "OP não encontrada" },
        { status: 404 }
      );
    }

    // Criar log de atividade
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

