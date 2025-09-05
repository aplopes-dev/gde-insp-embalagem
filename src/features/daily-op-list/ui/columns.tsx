"use client";

import { DataTableCommonActions } from "@/components/data-table/components/data-table-common-actions";
import { Badge } from "@/components/ui/badge";
import { OpStatus } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

export function useBoxOpColumns(): { columns: any[] } {
  const resourcePath = usePathname();
  const router = useRouter();

  const redirectAction = useCallback((uri: string) => {
    router.push(`${resourcePath}${uri}`);
  }, [router, resourcePath]);

  const getOpBoxStatusBadge = useCallback((status: OpStatus) => {
    let label;
    let variant: "default" | "success" | "warning" | "destructive" = "default";
    switch (status) {
      case OpStatus.COMPLETED:
        label = "Concluído";
        variant = "success";
        break;
      case OpStatus.PENDING:
        label = "Pendente";
        break;
      default:
        label = "Indefinido";
    }
    return <Badge variant={variant}>{label}</Badge>;
  }, []);

  const columns = useMemo(() => [
    {
      id: "oculosInstanceId",
      header: "Óculos",
      enableSorting: false,
      enableColumnFilter: true,
      cell: ({ row }) => {
        const instance: any = row.getValue("oculosInstance") || row.getValue("oculosInstanceId");
        return <div>{instance?.nome || ""}</div>;
      },
    },
    {
      id: "code",
      header: "Código",
      enableSorting: true,
    },
    {
      id: "createdAt",
      header: "Criado em",
      enableSorting: true,
      cell: ({ row }) => {
        const formatted = new Date(
          row.getValue("createdAt")
        ).toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
        });

        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      id: "finishedAt",
      header: "Finalizado em",
      enableSorting: true,
      cell: ({ row }) => {
        const value = row.getValue("finishedAt");
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
      id: "product",
      header: "Produto",
      enableSorting: false,
      cell: ({ row }) => {
        const product: any = row.getValue("product");
        return <div>{`${product?.code} - ${product?.name}`}</div>;
      },
    },
    {
      id: "quantityToProduce",
      header: "Quantidade",
      meta: {
        className: "flex-1 text-center",
      },
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const quantity = Number(row.getValue("quantityToProduce"));
        return <div className="text-center">{quantity}</div>;
      },
    },
    {
      id: "itemsPacked",
      header: "Quantidade embalada",
      meta: {
        className: "flex-1 text-center",
      },
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const quantity = Number(row.getValue("itemsPacked"));
        return <div className="text-center">{quantity}</div>;
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
        const status = row.getValue("status") as OpStatus;
        return (
          <div className="flex justify-end">{getOpBoxStatusBadge(status)}</div>
        );
      },
    },
    //TODO: ADD view page
    {
      id: "actions",
      header: () => <div className="hidden lg:block">Ações</div>,
      enableSorting: false,
      meta: {
        className: "flex-1 text-right",
      },
      cell: ({ row }) => {
        const rowId = row.original.id;
        return (
          <DataTableCommonActions
            className="flex justify-end items-center"
            resourceId={`${rowId}`}
            onClickView={() => redirectAction(`op/${rowId}/detail`)}
            disableEdit
            disableDelete
          />
        );
      },
    },
  ] as ColumnDef<any>[], [getOpBoxStatusBadge, redirectAction]);

  return { columns };
}
