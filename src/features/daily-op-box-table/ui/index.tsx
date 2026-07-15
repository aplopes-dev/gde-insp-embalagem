"use client";

import { opCompletionNowHandler } from "@/app/op/[opId]/actions";
import { ServerDataTable } from "@/components/server-data-table";
import { useToast } from "@/components/ui/use-toast";
import { useActionPageApi } from "@/hooks/use-action-page-api";
import { useFiltering } from "@/hooks/use-filtering";
import { usePagination } from "@/hooks/use-pagination";
import { useSorting } from "@/hooks/use-sorting";
import { useState } from "react";
import { generateBarcodeByBoxId, getPaginatedBoxOp } from "../actions";
import { useBoxOpColumns } from "./columns";
import { BoxOpDataTableToolbar } from "./toolbar";
import { error } from "console";

export default function DailyOpBoxTable({
  opId,
  onClickView,
  onCLickPrint,
}: {
  opId: number;
  onClickView: (v: any) => void;
  onCLickPrint: (v: any) => void;
}) {
  const { limit, onPaginationChange, skip, pagination } = usePagination(5);
  const { sorting, onSortingChange, field, order } = useSorting();
  const [externalLoading, setExternalLoading] = useState(false);
  const { columnFilters, onColumnFiltersChange } = useFiltering();
  const { toast } = useToast();

  const onCLickGenBarcode = async (boxId: string) => {
    setExternalLoading(true);
    try {
      const response: any = await generateBarcodeByBoxId(Number(opId), boxId);
      console.log("response");
      console.log(response);

      if (!response.id)
        throw new Error(
          response.errorData?.message || "Falha ao gerar etiqueta!"
        );
      await opCompletionNowHandler(response.id);
      toast({
        title: "Sucesso",
        description: "Etiqueta gerada com sucesso!",
      });
      setExternalLoading(false);
      forceRefresh();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      setExternalLoading(false);
    }
  };

  function forceRefresh() {
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  const { columns } = useBoxOpColumns({
    onCLickView: onClickView,
    onCLickGenBarcode: onCLickGenBarcode,
    onCLickPrint: onCLickPrint,
  });

  const [data, count, loading] = useActionPageApi({
    pagination: { skip, limit },
    sort: { field, order },
    filters: columnFilters,
    getAction: getPaginatedBoxOp,
    defautlFilters: [
      {
        id: "opId",
        value: {
          operator: "equals",
          value: Number(opId),
        },
      },
    ],
  });

  const pageCount = Math.ceil((count as number) / limit) || 1;

  return (
    <div>
      <ServerDataTable
        columns={columns}
        className="m-2 lg:m-4 xl:m-6 exl:m-10"
        data={data as any[]}
        loading={loading || externalLoading}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        sorting={sorting}
        onSortingChange={onSortingChange}
        onColumnFiltersChange={onColumnFiltersChange}
        columnFilters={columnFilters}
        childs={{
          toolbar: BoxOpDataTableToolbar,
        }}
      />
    </div>
  );
}
