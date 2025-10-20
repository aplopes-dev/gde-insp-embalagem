"use client";

import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Users,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface OpStatisticsCardsProps {
  statistics: Statistics;
}

export function OpStatisticsCards({
  statistics,
}: OpStatisticsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total de Caixas Inspecionadas */}
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">
              Caixas Inspecionadas
            </p>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {statistics.totalBoxesInspected}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              de {statistics.quantityToProduce} esperadas
            </p>
          </div>
          <Clock className="w-8 h-8 text-blue-500 opacity-50" />
        </div>
      </Card>

      {/* Taxa de Aprovação */}
      <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">
              Taxa de Aprovação
            </p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {statistics.approvalRate}%
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {statistics.approvalsCount} aprovadas
            </p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
        </div>
      </Card>

      {/* Taxa de Rejeição */}
      <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">
              Taxa de Rejeição
            </p>
            <p className="text-2xl font-bold text-red-900 mt-1">
              {statistics.rejectionRate}%
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {statistics.rejectionsCount} rejeitadas
            </p>
          </div>
          <XCircle className="w-8 h-8 text-red-500 opacity-50" />
        </div>
      </Card>

      {/* Tempo Médio de Inspeção */}
      <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">
              Tempo Médio
            </p>
            <p className="text-2xl font-bold text-yellow-900 mt-1">
              {statistics.averageInspectionTime.toFixed(1)}
            </p>
            <p className="text-xs text-gray-600 mt-2">minutos por caixa</p>
          </div>
          <TrendingUp className="w-8 h-8 text-yellow-500 opacity-50" />
        </div>
      </Card>

      {/* Peças Criadas */}
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">
              Peças Criadas
            </p>
            <p className="text-2xl font-bold text-purple-900 mt-1">
              {statistics.productsCreatedCount}
            </p>
            <p className="text-xs text-gray-600 mt-2">durante a OP</p>
          </div>
          <Plus className="w-8 h-8 text-purple-500 opacity-50" />
        </div>
      </Card>

      {/* Supervisores Envolvidos */}
      <Card className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">
              Supervisores
            </p>
            <p className="text-2xl font-bold text-indigo-900 mt-1">
              {statistics.supervisorsInvolved}
            </p>
            <p className="text-xs text-gray-600 mt-2">envolvidos</p>
          </div>
          <Users className="w-8 h-8 text-indigo-500 opacity-50" />
        </div>
      </Card>

      {/* Operadores Envolvidos */}
      <Card className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">
              Operadores
            </p>
            <p className="text-2xl font-bold text-cyan-900 mt-1">
              {statistics.operatorsInvolved}
            </p>
            <p className="text-xs text-gray-600 mt-2">envolvidos</p>
          </div>
          <Users className="w-8 h-8 text-cyan-500 opacity-50" />
        </div>
      </Card>

      {/* Total de Usuários */}
      <Card className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">
              Total de Usuários
            </p>
            <p className="text-2xl font-bold text-pink-900 mt-1">
              {statistics.totalUsersInvolved}
            </p>
            <p className="text-xs text-gray-600 mt-2">na OP</p>
          </div>
          <Users className="w-8 h-8 text-pink-500 opacity-50" />
        </div>
      </Card>
    </div>
  );
}

