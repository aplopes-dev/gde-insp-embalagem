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
      id: "op",
      header: "OP",
      enableSorting: false,
    },
    {
      id: "code",
      header: "Caixa",
      enableSorting: false,
    },
    {
      id: "createdAt",
      header: "Criado em",
      enableSorting: true,
      // meta: {
      //   className: "flex-1 text-right",
      // },
      cell: ({ row }) => {
        const formatted = new Date(
          row.getValue("createdAt")
        ).toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
        });

        return <div className="md:text-right font-medium">{formatted}</div>;
      },
    },
    {
      id: "packedAt",
      header: "Embalado em",
      enableSorting: true,
      cell: ({ row }) => {
        const formatted = new Date(
          row.getValue("createdAt")
        ).toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
        });

        return <div className="md:text-right font-medium">{formatted}</div>;
      },
    },
    {
      id: "item",
      header: "Item",
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      id: "quantity",
      header: "Quantidade",
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      id: "client",
      header: "Cliente",
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      meta: {
        className: "flex-1 text-center",
      },
      cell: ({ row }) => {
        const enabled = row.getValue("enabled");
        return (
          <div className="flex justify-center">
            {enabled == "enabled" ? <CheckIcon /> : <XIcon />}
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
