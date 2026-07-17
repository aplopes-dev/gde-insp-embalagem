"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { OpStatisticsCards } from "@/app/admin/_components/op-statistics-cards";
import { OpActivityTimeline } from "@/components/op-activity-timeline";
import { OpActivityFilters } from "@/app/admin/_components/op-activity-filters";
import { OperatorsStatsTable } from "@/app/admin/_components/operators-stats-table";
import { OpBoxesManager } from "@/app/admin/_components/op-boxes-manager";
import { OpOccurrencesManager } from "@/app/admin/_components/op-occurrences-manager";

interface Statistics {
  totalBoxesInspected: number;
  approvalsCount: number;
  rejectionsCount: number;
  approvalRate: number;
  rejectionRate: number;
  averageInspectionTime: number;
  productsCreatedCount: number;
  supervisorsInvolved: number;
  operatorsInvolved: number;
  totalUsersInvolved: number;
  opStartDate: string;
  opEndDate: string | null;
  opStatus: string;
  quantityToProduce: number;
}

interface ActivityLog {
  id: string;
  actionType: string;
  description: string;
  details?: any;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
  boxId?: string;
  productId?: number;
}

interface ActivityFilters {
  actionType: string;
  userId: string;
  startDate: string;
  endDate: string;
  status: string;
  searchId: string;
}

interface OperatorStats {
  userId: string;
  userName: string;
  email: string;
  totalInspections: number;
  approvalsCount: number;
  rejectionsCount: number;
  totalTime: number;
  averageInspectionTime: number;
  opsCount: number;
  firstAction: string;
  lastAction: string;
}

export default function OpDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isSupervisor =
    (session?.user as { role?: string } | undefined)?.role === "SUPERVISOR";
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLog[]>(
    []
  );
  const [operators, setOperators] = useState<OperatorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>({
    actionType: "",
    userId: "",
    startDate: "",
    endDate: "",
    status: "",
    searchId: "",
  });

  // Verificar autenticação e autorização
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && !isSupervisor) {
      router.push("/");
    }
  }, [status, isSupervisor, router]);

  // Carregar dados
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar estatísticas
        const statsRes = await fetch(
          `/api/admin/ops/${params.id}/statistics`
        );
        if (!statsRes.ok) {
          if (statsRes.status === 403) {
            setError(
              "Acesso negado. Apenas supervisores podem acessar este painel."
            );
            setTimeout(() => router.push("/admin"), 2000);
            return;
          }
          throw new Error("Erro ao carregar estatísticas");
        }
        const statsData = await statsRes.json();
        setStatistics(statsData);

        // Buscar activity log
        const logsRes = await fetch(
          `/api/admin/ops/${params.id}/activity-log`
        );
        if (!logsRes.ok) {
          throw new Error("Erro ao carregar atividades");
        }
        const logsData = await logsRes.json();
        setActivities(logsData);
        setFilteredActivities(logsData);

        // Buscar estatísticas dos operadores
        const operatorsUrl = new URL(
          `/api/admin/ops/${params.id}/operators-stats`,
          window.location.origin
        );

        const operatorsRes = await fetch(operatorsUrl.toString());
        if (!operatorsRes.ok) {
          throw new Error("Erro ao carregar estatísticas dos operadores");
        }
        const operatorsData = await operatorsRes.json();
        setOperators(operatorsData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar dados"
        );
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated" && isSupervisor) {
      fetchData();
    }
  }, [params.id, status, isSupervisor, router]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = activities;

    if (filters.actionType) {
      filtered = filtered.filter((a) => a.actionType === filters.actionType);
    }

    if (filters.userId) {
      filtered = filtered.filter((a) => a.user.id === filters.userId);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(
        (a) => new Date(a.createdAt) >= startDate
      );
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (a) => new Date(a.createdAt) <= endDate
      );
    }

    if (filters.searchId) {
      const searchLower = filters.searchId.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.boxId?.toLowerCase().includes(searchLower) ||
          a.productId?.toString().includes(searchLower)
      );
    }

    setFilteredActivities(filtered);
  }, [filters, activities]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <p className="text-gray-600">Carregando dados...</p>
        </Card>
      </div>
    );
  }

  const uniqueUsers = Array.from(
    new Map(activities.map((a) => [a.user.id, a.user])).values()
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-3xl font-bold">
              🔒 Painel de Controle - OP #{params.id}
            </h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Acesso exclusivo para supervisores
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div>
        <h2 className="text-xl font-semibold mb-4">📊 Estatísticas da OP</h2>
        <OpStatisticsCards statistics={statistics} />
      </div>

      {/* Caixas */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Caixas da OP</h2>
        <OpBoxesManager
          opId={params.id}
          onChanged={async () => {
            const logsRes = await fetch(
              `/api/admin/ops/${params.id}/activity-log`
            );
            if (logsRes.ok) {
              const logsData = await logsRes.json();
              setActivities(logsData);
              setFilteredActivities(logsData);
            }
          }}
        />
      </div>

      {/* Ocorrências formais */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Ocorrências</h2>
        <OpOccurrencesManager
          opId={params.id}
          onChanged={async () => {
            const logsRes = await fetch(
              `/api/admin/ops/${params.id}/activity-log`
            );
            if (logsRes.ok) {
              const logsData = await logsRes.json();
              setActivities(logsData);
              setFilteredActivities(logsData);
            }
          }}
        />
      </div>

      {/* Filtros */}
      <div>
        <h2 className="text-xl font-semibold mb-4">🔍 Filtros</h2>
        <OpActivityFilters
          onFilterChange={setFilters}
          users={uniqueUsers}
        />
      </div>

      {/* Estatísticas dos Operadores */}
      <div>
        <h2 className="text-xl font-semibold mb-4">👥 Estatísticas dos Operadores</h2>
        <OperatorsStatsTable operators={operators} />
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          📋 Histórico de Ações ({filteredActivities.length})
        </h2>
        <OpActivityTimeline activities={filteredActivities} />
      </div>
    </div>
  );
}

