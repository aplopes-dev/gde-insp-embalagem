"use client";

import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { usePathname, useRouter } from "next/navigation";

export function useBoxOpColumns(): { columns: any[] } {
  const resourcePath = usePathname();
  const router = useRouter();

  function redirectAction(uri: string) {
    router.push(`${resourcePath}/${uri}`);
  }

  function getStatusVariant(status?: number) {
    switch (status) {
      case 1:
        return "success";
      case 2:
        return "destructive";
      default:
        return "secondary";
    }
  }

  function getStatusName(status?: number) {
    switch (status) {
      case 1:
        return "Concluído";
      case 2:
        return "Quebra de OP";
      default:
        return "Pendente";
    }
  }

  const columns = [
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
      id: "status",
      header: "Status",
      enableSorting: false,
      meta: {
        className: "flex-1 text-right",
      },
      cell: ({ row }) => {
        const status = Number(row.getValue("status"));
        return (
          <div className="flex justify-end">
            {/* {status == "enabled" ? <CheckIcon /> : <XIcon />} */}
            <Badge variant={getStatusVariant(status)}>
              {getStatusName(status)}
            </Badge>
          </div>
        );
      },
    },
    // {
    //   id: "actions",
    //   header: () => <div className="hidden lg:block">Ações</div>,
    //   enableSorting: false,
    //   meta: {
    //     className: "flex-1 text-right",
    //   },
    //   cell: ({ row }) => {
    //     const rowId = row.original.id;
    //     return (
    //       <DataTableCommonActions
    //         className="flex justify-end items-center"
    //         resourceId={`${rowId}`}
    //         onClickView={() => redirectAction(`/${rowId}`)}
    //         disableEdit
    //         disableDelete
    //       />
    //     );
    //   },
    // },
  ] as ColumnDef<any>[];
  //TODO: ] as ColumnDef<OpBoxType>[];

  return { columns };
}
