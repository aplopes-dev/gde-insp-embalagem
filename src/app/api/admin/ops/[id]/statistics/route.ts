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

    if (!user || user.role !== "ADMINISTRADOR") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem acessar." },
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

    // Contar inspeções aprovadas
    const approvalsCount = await db.opActivityLog.count({
      where: {
        opId,
        actionType: "BOX_INSPECTION_APPROVED",
      },
    });

    // Contar inspeções rejeitadas
    const rejectionsCount = await db.opActivityLog.count({
      where: {
        opId,
        actionType: "BOX_INSPECTION_REJECTED",
      },
    });

    // Contar peças criadas
    const productsCreatedCount = await db.opActivityLog.count({
      where: {
        opId,
        actionType: "PRODUCT_CREATED",
      },
    });

    // Contar usuários únicos envolvidos
    const uniqueUsers = await db.opActivityLog.findMany({
      where: { opId },
      distinct: ["userId"],
      select: { userId: true },
    });

    // Recuperar informações dos usuários
    const userDetails = await db.user.findMany({
      where: {
        id: { in: uniqueUsers.map((u) => u.userId) },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    const supervisors = userDetails.filter((u) => u.role === "SUPERVISOR");
    const operators = userDetails.filter((u) => u.role === "OPERADOR");

    // Calcular taxa de aprovação
    const totalInspections = approvalsCount + rejectionsCount;
    const approvalRate =
      totalInspections > 0
        ? Math.round((approvalsCount / totalInspections) * 100)
        : 0;

    // Calcular tempo médio de inspeção (em minutos)
    const inspectionLogs = await db.opActivityLog.findMany({
      where: {
        opId,
        actionType: {
          in: ["BOX_INSPECTION_APPROVED", "BOX_INSPECTION_REJECTED"],
        },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    let averageInspectionTime = 0;
    if (inspectionLogs.length > 1) {
      const timeDiffs = [];
      for (let i = 1; i < inspectionLogs.length; i++) {
        const diff =
          (inspectionLogs[i].createdAt.getTime() -
            inspectionLogs[i - 1].createdAt.getTime()) /
          (1000 * 60); // converter para minutos
        timeDiffs.push(diff);
      }
      averageInspectionTime =
        timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    }

    return NextResponse.json({
      totalBoxesInspected: totalInspections,
      approvalsCount,
      rejectionsCount,
      approvalRate,
      rejectionRate: 100 - approvalRate,
      averageInspectionTime: Math.round(averageInspectionTime * 100) / 100,
      productsCreatedCount,
      supervisorsInvolved: supervisors.length,
      operatorsInvolved: operators.length,
      totalUsersInvolved: userDetails.length,
      opStartDate: op.createdAt,
      opEndDate: op.finishedAt,
      opStatus: op.status,
      quantityToProduce: op.quantityToProduce,
    });
  } catch (error) {
    console.error("Erro ao recuperar estatísticas:", error);
    return NextResponse.json(
      { error: "Erro ao recuperar estatísticas" },
      { status: 500 }
    );
  }
}

