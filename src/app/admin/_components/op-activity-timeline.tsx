"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  XCircle,
  Plus,
  Clock,
  AlertCircle,
} from "lucide-react";

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

interface OpActivityTimelineProps {
  activities: ActivityLog[];
}

export function OpActivityTimeline({ activities }: OpActivityTimelineProps) {
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "BOX_INSPECTION_APPROVED":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "BOX_INSPECTION_REJECTED":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "PRODUCT_CREATED":
        return <Plus className="w-5 h-5 text-blue-500" />;
      case "PRODUCT_AUTHORIZED":
        return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
      case "STATUS_CHANGED":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case "BOX_INSPECTION_APPROVED":
        return "Inspeção Aprovada";
      case "BOX_INSPECTION_REJECTED":
        return "Inspeção Rejeitada";
      case "PRODUCT_CREATED":
        return "Peça Criada";
      case "PRODUCT_AUTHORIZED":
        return "Peça Autorizada";
      case "STATUS_CHANGED":
        return "Status Alterado";
      case "OP_STARTED":
        return "OP Iniciada";
      case "OP_COMPLETED":
        return "OP Concluída";
      default:
        return actionType;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case "BOX_INSPECTION_APPROVED":
        return "bg-green-50 border-green-200";
      case "BOX_INSPECTION_REJECTED":
        return "bg-red-50 border-red-200";
      case "PRODUCT_CREATED":
      case "PRODUCT_AUTHORIZED":
        return "bg-blue-50 border-blue-200";
      case "STATUS_CHANGED":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  if (activities.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">Nenhuma atividade registrada</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <Card
          key={activity.id}
          className={`p-4 border-l-4 ${getActionColor(activity.actionType)}`}
        >
          <div className="flex items-start gap-4">
            <div className="mt-1">{getActionIcon(activity.actionType)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">
                  {format(new Date(activity.createdAt), "HH:mm:ss", {
                    locale: ptBR,
                  })}
                </span>
                <Badge variant="outline" className="text-xs">
                  {getActionLabel(activity.actionType)}
                </Badge>
              </div>

              <div className="mt-2 text-sm">
                <p className="font-medium">
                  {activity.user.name}
                  {activity.user.role === "SUPERVISOR" && (
                    <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      Supervisor
                    </span>
                  )}
                </p>
                <p className="text-gray-600 text-xs">{activity.user.email}</p>
              </div>

              <p className="mt-2 text-sm text-gray-700">
                {activity.description}
              </p>

              {activity.details && (
                <div className="mt-2 text-xs text-gray-600 bg-white bg-opacity-50 p-2 rounded">
                  <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(activity.details, null, 2)}
                  </pre>
                </div>
              )}

              {activity.boxId && (
                <p className="mt-2 text-xs text-gray-600">
                  <span className="font-semibold">Caixa:</span> {activity.boxId}
                </p>
              )}

              {activity.productId && (
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Peça ID:</span>{" "}
                  {activity.productId}
                </p>
              )}

              <p className="mt-2 text-xs text-gray-500">
                {format(new Date(activity.createdAt), "dd/MM/yyyy HH:mm:ss", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

