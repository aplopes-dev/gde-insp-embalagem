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
    const user = session?.user as any;

    if (!user || user.role !== "ADMINISTRADOR") {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const userId = params.id;

    // Buscar informações do operador
    const operator = await db.user.findUnique({
      where: { id: userId },
    });

    if (!operator || operator.role !== "OPERADOR") {
      return NextResponse.json(
        { error: "Operador não encontrado" },
        { status: 404 }
      );
    }

    // Buscar todos os logs de atividade do operador
    const activityLogs = await db.opActivityLog.findMany({
      where: {
        userId,
        actionType: {
          in: ["BOX_INSPECTION_APPROVED", "BOX_INSPECTION_REJECTED"],
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Agrupar por OP
    const opMap = new Map<
      number,
      {
        opId: number;
        inspections: Array<{
          id: string;
          boxId?: string;
          actionType: string;
          createdAt: Date;
          details?: any;
        }>;
      }
    >();

    activityLogs.forEach((log) => {
      if (!opMap.has(log.opId)) {
        opMap.set(log.opId, {
          opId: log.opId,
          inspections: [],
        });
      }
      opMap.get(log.opId)!.inspections.push({
        id: log.id,
        boxId: log.boxId,
        actionType: log.actionType,
        createdAt: log.createdAt,
        details: log.details,
      });
    });

    // Buscar informações das OPs
    const opIds = Array.from(opMap.keys());
    const ops = await db.op.findMany({
      where: {
        id: {
          in: opIds,
        },
      },
    });

    // Construir resposta com histórico detalhado
    const history = ops.map((op) => {
      const inspections = opMap.get(op.id)!.inspections;
      const approvalsCount = inspections.filter(
        (i) => i.actionType === "BOX_INSPECTION_APPROVED"
      ).length;
      const rejectionsCount = inspections.filter(
        (i) => i.actionType === "BOX_INSPECTION_REJECTED"
      ).length;

      // Calcular tempo de inspeção
      const sortedInspections = [...inspections].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
      const firstInspection = sortedInspections[0];
      const lastInspection = sortedInspections[sortedInspections.length - 1];
      const totalTimeMinutes =
        (lastInspection.createdAt.getTime() -
          firstInspection.createdAt.getTime()) /
        1000 /
        60;
      const averageTimeMinutes =
        inspections.length > 0 ? totalTimeMinutes / inspections.length : 0;

      return {
        opId: op.id,
        opCode: op.code,
        opStatus: op.status,
        quantityToProduce: op.quantityToProduce,
        createdAt: op.createdAt,
        finishedAt: op.finishedAt,
        totalInspections: inspections.length,
        approvalsCount,
        rejectionsCount,
        approvalRate:
          inspections.length > 0
            ? ((approvalsCount / inspections.length) * 100).toFixed(1)
            : 0,
        rejectionRate:
          inspections.length > 0
            ? ((rejectionsCount / inspections.length) * 100).toFixed(1)
            : 0,
        totalTimeMinutes: totalTimeMinutes.toFixed(1),
        averageTimeMinutes: averageTimeMinutes.toFixed(1),
        inspections: inspections.map((i) => ({
          id: i.id,
          boxId: i.boxId,
          status: i.actionType === "BOX_INSPECTION_APPROVED" ? "APROVADA" : "REJEITADA",
          createdAt: i.createdAt,
        })),
      };
    });

    // Calcular estatísticas gerais
    const totalInspections = activityLogs.length;
    const totalApprovalsCount = activityLogs.filter(
      (l) => l.actionType === "BOX_INSPECTION_APPROVED"
    ).length;
    const totalRejectionsCount = activityLogs.filter(
      (l) => l.actionType === "BOX_INSPECTION_REJECTED"
    ).length;

    return NextResponse.json({
      operator: {
        id: operator.id,
        name: operator.name,
        email: operator.email,
        role: operator.role,
      },
      statistics: {
        totalOps: history.length,
        totalInspections,
        totalApprovalsCount,
        totalRejectionsCount,
        overallApprovalRate:
          totalInspections > 0
            ? ((totalApprovalsCount / totalInspections) * 100).toFixed(1)
            : 0,
        overallRejectionRate:
          totalInspections > 0
            ? ((totalRejectionsCount / totalInspections) * 100).toFixed(1)
            : 0,
        averageTimePerInspection:
          totalInspections > 0
            ? (
                history.reduce(
                  (sum, h) => sum + parseFloat(h.totalTimeMinutes as string),
                  0
                ) / history.length
              ).toFixed(1)
            : 0,
      },
      history: history.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error) {
    console.error("Erro ao buscar histórico do operador:", error);
    return NextResponse.json(
      { error: "Erro ao buscar histórico" },
      { status: 500 }
    );
  }
}

