"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, CheckCircle, XCircle, Zap, Eye } from "lucide-react";

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

interface OperatorsStatsTableProps {
  operators: OperatorStats[];
}

export function OperatorsStatsTable({ operators }: OperatorsStatsTableProps) {
  if (operators.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum operador encontrado para este período</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Estatísticas dos Operadores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operador</TableHead>
                <TableHead className="text-center">Inspeções</TableHead>
                <TableHead className="text-center">Aprovadas</TableHead>
                <TableHead className="text-center">Rejeitadas</TableHead>
                <TableHead className="text-center">Taxa Aprovação</TableHead>
                <TableHead className="text-center">Tempo Médio</TableHead>
                <TableHead className="text-center">OPs Realizadas</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map((operator) => {
                const approvalRate =
                  operator.totalInspections > 0
                    ? (
                        (operator.approvalsCount / operator.totalInspections) *
                        100
                      ).toFixed(1)
                    : 0;

                return (
                  <TableRow key={operator.userId}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{operator.userName}</p>
                        <p className="text-xs text-gray-500">
                          {operator.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-semibold">
                        {operator.totalInspections}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          {operator.approvalsCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-red-600">
                          {operator.rejectionsCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={`font-semibold ${
                          parseFloat(approvalRate as string) >= 80
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                            : parseFloat(approvalRate as string) >= 60
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                        }`}
                      >
                        {approvalRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold">
                          {operator.averageInspectionTime.toFixed(1)} min
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-4 h-4 text-purple-600" />
                        <Badge variant="secondary" className="font-semibold">
                          {operator.opsCount}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/admin/operators/${operator.userId}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Ver Histórico"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Resumo */}
        <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total de Operadores
            </p>
            <p className="text-2xl font-bold">{operators.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total de Inspeções
            </p>
            <p className="text-2xl font-bold">
              {operators.reduce((sum, op) => sum + op.totalInspections, 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tempo Médio Geral
            </p>
            <p className="text-2xl font-bold">
              {(
                operators.reduce((sum, op) => sum + op.averageInspectionTime, 0) /
                operators.length
              ).toFixed(1)}{" "}
              min
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Taxa Média de Aprovação
            </p>
            <p className="text-2xl font-bold">
              {(
                (operators.reduce((sum, op) => sum + op.approvalsCount, 0) /
                  operators.reduce((sum, op) => sum + op.totalInspections, 0)) *
                100
              ).toFixed(1)}
              %
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

