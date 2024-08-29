"use client";

import { DataTableCommonActions } from "@/components/data-table/components/data-table-common-actions";
import { ColumnDef } from "@tanstack/react-table";
import { CheckIcon, XIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function useBoxOpColumns(): { columns: any[] } {
  const resourcePath = usePathname();
  const router = useRouter();

  function redirectAction(uri: string) {
    router.push(`${resourcePath}/${uri}`);
  }

  const columns = [
    {
      id: "opCode",
      header: "OP",
      enableSorting: false,
    },
    {
      id: "code",
      header: "Embalagem",
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
      id: "boxName",
      header: "Caixa",
      enableSorting: false,
    },
    {
      id: "productName",
      header: "Item",
      enableSorting: false,
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
        const quantity = Number(row.getValue("quantity"));
        return <div className="text-center">{quantity}</div>;
      },
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      meta: {
        className: "flex-1 text-center",
      },
      cell: ({ row }) => {
        const status = row.getValue("status");
        return (
          <div className="flex justify-center">
            {status == "enabled" ? <CheckIcon /> : <XIcon />}
          </div>
        );
      },
    },
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
            onClickView={() => redirectAction(`/${rowId}`)}
            disableEdit
            disableDelete
          />
        );
      },
    },
  ] as ColumnDef<any>[];
  //TODO: ] as ColumnDef<OpBoxType>[];

  return { columns };
}
