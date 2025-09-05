"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpBoxStatus } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { Barcode, EyeIcon } from "lucide-react";
import { useCallback, useMemo } from "react";

export function useBoxOpColumns({
  onCLickView,
  onCLickGenBarcode,
  onCLickPrint,
  generatingBoxId,
}: {
  onCLickView: (value: any) => void;
  onCLickGenBarcode: (boxId: any) => void;
  onCLickPrint: (value: any) => void;
  generatingBoxId?: string | null;
}): {
  columns: any[];
} {
  const getOpBoxStatusBadge = useCallback((status: OpBoxStatus) => {
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
  }, []);

  const columns = useMemo(() => [
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
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const id = row.original.id;
        const quantity = Number(row.getValue("quantity"));
        return (
          <div className="flex">
            <Button
              size={"sm"}
              variant={"secondary"}
              title="Visualizar blisters"
              onClick={() => onCLickView(id)}
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
      header: "Etiqueta",
      enableSorting: false,
      cell: ({ row }) => {
        const barCodeGeneratedAt = row.getValue("barCodeGeneratedAt");
        const barCode = row?.original?.barCode || undefined;
        const quantity = Number(row.getValue("quantity"));
        const status = row.getValue("status") as OpBoxStatus;
        const boxId = row.original.id;

        const formatted = barCodeGeneratedAt
          ? new Date(`${barCodeGeneratedAt}`).toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "numeric",
            year: "numeric",
          })
          : "";

        // Bloqueia reimpressão se o código já foi gerado (significa que já foi impressa)
        const isAlreadyPrinted = !!barCodeGeneratedAt;
        const isGenerating = generatingBoxId === boxId;

        return (
          <div className="font-medium">
            {barCode && (
              <div className="flex gap-1 items-center" title={barCode}>
                <Button
                  size={"sm"}
                  variant={isAlreadyPrinted ? "secondary" : "default"}
                  title={isAlreadyPrinted ? "Etiqueta já foi impressa - reimpressão bloqueada" : "Imprimir novamente"}
                  disabled={isAlreadyPrinted}
                  onClick={() => {
                    if (!isAlreadyPrinted) {
                      onCLickPrint({ barcode: barCode, quantity });
                    }
                  }}
                >
                  <Barcode className="w-4 h-4" />
                </Button>
                <div className="flex flex-col ml-1">
                  <span>
                    <strong>Código:</strong> {barCode}
                  </span>
                  <span>
                    <strong>Gerado em:</strong> {formatted}
                  </span>
                  {isAlreadyPrinted && (
                    <span className="text-red-600 text-sm">⚠️ Etiqueta já impressa</span>
                  )}
                </div>
              </div>
            )}

            {(!barCode && status !== OpBoxStatus.PENDING) && (
              <div className="flex items-center gap-1">
                <Badge variant={"default"}>Pendente</Badge>
                <Button
                  size={"sm"}
                  variant={"secondary"}
                  disabled={isGenerating}
                  onClick={() => onCLickGenBarcode(boxId)}
                >
                  <Barcode className="mr-2 w-4 h-4" /> {isGenerating ? "Gerando..." : "Gerar"}
                </Button>
              </div>
            )}

            {(!barCode && status == OpBoxStatus.PENDING) && (
              <div className="flex items-center gap-1">
                <Badge variant={"default"}>Pendente</Badge>
              </div>
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
  ] as ColumnDef<any>[], [getOpBoxStatusBadge, onCLickGenBarcode, onCLickPrint, onCLickView, generatingBoxId]);

  return { columns };
}
