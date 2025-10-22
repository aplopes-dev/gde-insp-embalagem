import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";

export async function GET(
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

    // Verificar se é administrador
    const user = await db.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || user.role !== "SUPERVISOR") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas supervisores podem acessar." },
        { status: 403 }
      );
    }

    const opId = parseInt(params.id);

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

    // Recuperar activity logs
    const activityLogs = await db.opActivityLog.findMany({
      where: { opId },
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(activityLogs);
  } catch (error) {
    console.error("Erro ao recuperar activity log:", error);
    return NextResponse.json(
      { error: "Erro ao recuperar activity log" },
      { status: 500 }
    );
  }
}

