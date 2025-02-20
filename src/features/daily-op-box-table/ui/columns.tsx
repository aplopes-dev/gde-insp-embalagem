"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { CheckIcon, EyeIcon, XIcon } from "lucide-react";

export function useBoxOpColumns({
  onCLickView,
}: {
  onCLickView: (value: any) => void;
}): {
  columns: any[];
} {
  function getStatusBadge(status: number) {
    let label = "Pendente";
    let variant: "default" | "success" | "destructive" = "default";
    switch (status) {
      case 1:
        label = "Concluído";
        variant = "success";
        break;
      case 2:
        label = "Quebra de Caixa";
        variant = "destructive";
        break;
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
      id: "status",
      header: "Status",
      enableSorting: false,
      meta: {
        className: "flex-1 text-right",
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as number;
        return <div className="flex justify-end">{getStatusBadge(status)}</div>;
      },
    },
  ] as ColumnDef<any>[];

  return { columns };
}
