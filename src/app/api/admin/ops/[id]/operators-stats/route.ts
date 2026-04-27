import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";
import { nestGetOperatorStats, useGdeApi } from "@/libs/gde-api";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || user.role !== "SUPERVISOR") {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const opId = parseInt(params.id);

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (useGdeApi()) {
      try {
        const operatorArray = await nestGetOperatorStats(params.id, {
          startDate: startDate ?? undefined,
          endDate: endDate ?? undefined,
        });
        return NextResponse.json(operatorArray);
      } catch {
        return NextResponse.json({ error: "Erro ao buscar estatísticas" }, { status: 500 });
      }
    }

    // Construir filtro de data
    const dateFilter: any = {
      opId,
    };

    if (startDate) {
      dateFilter.createdAt = {
        ...dateFilter.createdAt,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.createdAt = {
        ...dateFilter.createdAt,
        lte: end,
      };
    }

    // Buscar todos os logs de atividade para esta OP
    const activityLogs = await db.opActivityLog.findMany({
      where: dateFilter,
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Agrupar por operador (usuários com role OPERADOR)
    const operatorStats = new Map<
      string,
      {
        userId: string;
        userName: string;
        email: string;
        totalInspections: number;
        approvalsCount: number;
        rejectionsCount: number;
        totalTime: number; // em minutos
        averageInspectionTime: number; // em minutos
        opsCount: number;
        firstAction: Date;
        lastAction: Date;
      }
    >();

    const inspectionTimes: { [userId: string]: number[] } = {};

    activityLogs.forEach((log) => {
      if (log.user.role === "OPERADOR") {
        if (!operatorStats.has(log.user.id)) {
          operatorStats.set(log.user.id, {
            userId: log.user.id,
            userName: log.user.name,
            email: log.user.email,
            totalInspections: 0,
            approvalsCount: 0,
            rejectionsCount: 0,
            totalTime: 0,
            averageInspectionTime: 0,
            opsCount: 0,
            firstAction: log.createdAt,
            lastAction: log.createdAt,
          });
          inspectionTimes[log.user.id] = [];
        }

        const stats = operatorStats.get(log.user.id)!;

        // Contar inspeções
        if (
          log.actionType === "BOX_INSPECTION_APPROVED" ||
          log.actionType === "BOX_INSPECTION_REJECTED"
        ) {
          stats.totalInspections++;

          if (log.actionType === "BOX_INSPECTION_APPROVED") {
            stats.approvalsCount++;
          } else {
            stats.rejectionsCount++;
          }
        }

        // Atualizar datas
        if (log.createdAt < stats.firstAction) {
          stats.firstAction = log.createdAt;
        }
        if (log.createdAt > stats.lastAction) {
          stats.lastAction = log.createdAt;
        }
      }
    });

    // Calcular tempo médio de inspeção
    operatorStats.forEach((stats, userId) => {
      if (stats.totalInspections > 0) {
        const timeRange =
          (stats.lastAction.getTime() - stats.firstAction.getTime()) / 1000 / 60; // em minutos
        stats.totalTime = timeRange;
        stats.averageInspectionTime = timeRange / stats.totalInspections;
      }
    });

    // Contar OPs por operador
    const opsPerOperator = new Map<string, Set<number>>();

    activityLogs.forEach((log) => {
      if (log.user.role === "OPERADOR") {
        if (!opsPerOperator.has(log.user.id)) {
          opsPerOperator.set(log.user.id, new Set());
        }
        opsPerOperator.get(log.user.id)!.add(log.opId);
      }
    });

    // Atualizar contagem de OPs
    opsPerOperator.forEach((ops, userId) => {
      const stats = operatorStats.get(userId);
      if (stats) {
        stats.opsCount = ops.size;
      }
    });

    // Converter para array e ordenar por total de inspeções
    const operatorArray = Array.from(operatorStats.values()).sort(
      (a, b) => b.totalInspections - a.totalInspections
    );

    return NextResponse.json(operatorArray);
  } catch (error) {
    console.error("Erro ao buscar estatísticas de operadores:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  }
}

