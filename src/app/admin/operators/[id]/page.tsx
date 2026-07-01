"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OperatorInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Statistics {
  totalOps: number;
  totalInspections: number;
  totalApprovalsCount: number;
  totalRejectionsCount: number;
  overallApprovalRate: string;
  overallRejectionRate: string;
  averageTimePerInspection: string;
}

interface OpHistory {
  opId: number;
  opCode: string;
  opStatus: string;
  quantityToProduce: number;
  createdAt: string;
  finishedAt: string | null;
  totalInspections: number;
  approvalsCount: number;
  rejectionsCount: number;
  approvalRate: string;
  rejectionRate: string;
  totalTimeMinutes: string;
  averageTimeMinutes: string;
  inspections: Array<{
    id: string;
    boxId?: string;
    status: string;
    createdAt: string;
  }>;
}

interface HistoryData {
  operator: OperatorInfo;
  statistics: Statistics;
  history: OpHistory[];
}

export default function OperatorHistoryPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isSupervisor =
    (session?.user as { role?: string } | undefined)?.role === "SUPERVISOR";
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && !isSupervisor) {
      router.push("/");
    }
  }, [status, isSupervisor, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/admin/operators/${params.id}/history`);
        if (!res.ok) {
          if (res.status === 403) {
            setError("Acesso negado. Apenas supervisores podem acessar.");
            setTimeout(() => router.push("/admin"), 2000);
            return;
          }
          if (res.status === 404) {
            setError("Operador não encontrado.");
            setTimeout(() => router.push("/admin/ops"), 2000);
            return;
          }
          throw new Error("Erro ao carregar histórico");
        }

        const historyData = await res.json();
        setData(historyData);
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

  if (!data) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <p className="text-gray-600">Carregando dados...</p>
        </Card>
      </div>
    );
  }

  const { operator, statistics, history } = data;

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
              👤 Histórico do Operador
            </h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {operator.name} ({operator.email})
          </p>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de OPs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalOps}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Inspeções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalInspections}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.overallApprovalRate}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statistics.averageTimePerInspection} min
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes por OP */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de OPs Inspecionadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código OP</TableHead>
                  <TableHead className="text-center">Inspeções</TableHead>
                  <TableHead className="text-center">Aprovadas</TableHead>
                  <TableHead className="text-center">Rejeitadas</TableHead>
                  <TableHead className="text-center">Taxa Aprovação</TableHead>
                  <TableHead className="text-center">Tempo Total</TableHead>
                  <TableHead className="text-center">Tempo Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Nenhuma inspeção encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((op) => (
                    <TableRow key={op.opId}>
                      <TableCell className="font-semibold">{op.opCode}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{op.totalInspections}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-semibold">
                            {op.approvalsCount}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-red-600 font-semibold">
                            {op.rejectionsCount}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`font-semibold ${
                            parseFloat(op.approvalRate as string) >= 80
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                              : parseFloat(op.approvalRate as string) >= 60
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                          }`}
                        >
                          {op.approvalRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold">
                            {op.totalTimeMinutes} min
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">
                          {op.averageTimeMinutes} min
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

