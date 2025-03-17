"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpBoxStatus } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { Barcode, EyeIcon } from "lucide-react";

export function useBoxOpColumns({
  onCLickView,
}: {
  onCLickView: (value: any) => void;
}): {
  columns: any[];
} {
  function getOpBoxStatusBadge(status: OpBoxStatus) {
    let label;
    let variant: "default" | "success" | "warning" | "destructive" = "default";
    switch (status) {
      case OpBoxStatus.PACKAGED_W_BREAK:
        label = "Quebra de Caixa";
        variant = "warning";
        break;
      case OpBoxStatus.PACKAGED:
        label = "Embalada";
        variant = "success";
        break;
      case OpBoxStatus.PENDING:
        label = "Pendente";
        break;
      default:
        label = "Indefinido";
    }
    return <Badge variant={variant}>{label}</Badge>;
  }

  const columns = [
    {
      id: "code",
      header: "Código",
      enableSorting: false,
    },
    {
      id: "packedAt",
      header: "Embalado em",
      enableSorting: true,
      cell: ({ row }) => {
        const value = row.getValue("packedAt");
        const formatted = value
          ? new Date(`${value}`).toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "numeric",
              year: "numeric",
            })
          : "";

        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      id: "quantity",
      header: "Quantidade",
      meta: {
        className: "flex-1 text-center",
      },
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const id = row.original.id;
        const quantity = Number(row.getValue("quantity"));
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              title="Visualizar blisters"
              onClick={() => {
                onCLickView(id);
              }}
              className="flex gap-2"
            >
              <EyeIcon className="w-4 h-4" />
              <span>{quantity}</span>
            </Button>
          </div>
        );
      },
    },
    {
      id: "barCodeGeneratedAt",
      header: "Cod. Etiqueta",
      enableSorting: false,
      cell: ({ row }) => {
        const barCodeGeneratedAt = row.getValue("barCodeGeneratedAt");
        const barCode = row?.original?.barCode || undefined;
        const status = row.getValue("status") as OpBoxStatus;

        const formatted = barCodeGeneratedAt
          ? new Date(`${barCodeGeneratedAt}`).toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "numeric",
              year: "numeric",
            })
          : "";

        return (
          <div className="font-medium">
            {barCode ? (
              <div className="flex gap-1 items-center" title={barCode}>
                <Barcode />
                <span className="ml-1">{formatted}</span>
              </div>
            ) : (
              <Badge variant={"default"}>Pendente</Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      meta: {
        className: "flex-1 text-right",
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as OpBoxStatus;
        return (
          <div className="flex justify-end">{getOpBoxStatusBadge(status)}</div>
        );
      },
    },
  ] as ColumnDef<any>[];

  return { columns };
}
