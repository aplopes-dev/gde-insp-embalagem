"use client";

import { opCompletionNowHandler } from "@/app/op/[opId]/actions";
import { ServerDataTable } from "@/components/server-data-table";
import { useToast } from "@/components/ui/use-toast";
import { useActionPageApi } from "@/hooks/use-action-page-api";
import { useFiltering } from "@/hooks/use-filtering";
import { usePagination } from "@/hooks/use-pagination";
import { useSorting } from "@/hooks/use-sorting";
import { useState } from "react";
import { generateBarcodeByBoxId, getPaginatedBoxOp, claimNextPendingBox } from "../actions";
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
  const [generatingBoxId, setGeneratingBoxId] = useState<string | null>(null);
  const { columnFilters, onColumnFiltersChange } = useFiltering();
  const { toast } = useToast();

  const onCLickGenBarcode = async (boxId: any) => {
    // Debounce simples: se já estamos gerando para esta caixa, ignore
    if (generatingBoxId === boxId) return;
    setGeneratingBoxId(boxId);
    setExternalLoading(true);
    try {
      const response: any = await generateBarcodeByBoxId(Number(opId), boxId);

      if (!response.id) {
        // Trata 409 explícito (já gerada)
        if (response?.status === 409) {
          toast({ title: "Etiqueta já gerada", description: response?.errorData?.message || "Esta caixa já possui etiqueta.", variant: "default" });
          return;
        }
        throw new Error(response.errorData?.message || "Falha ao gerar etiqueta!");
      }

      await opCompletionNowHandler(response.id);
      toast({ title: "Sucesso", description: "Etiqueta gerada com sucesso!" });
      forceRefresh();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setExternalLoading(false);
      setGeneratingBoxId(null);
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

  const pageCount = Math.round((count as number) / limit);

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
          toolbar: (props: any) => (
            <BoxOpDataTableToolbar
              {...props}
              onPickNextPendingBox={async () => {
                try {
                  // Faz claim atômico da próxima caixa pendente e abre (instanceId resolvido no servidor)
                  const next: any = await claimNextPendingBox(Number(opId));
                  if (next?.id) {
                    onClickView(next.id);
                    return;
                  }
                  // Tratamento de respostas de erro padronizadas (ApiResponseError)
                  if (next?.status === 404) {
                    toast({ title: "Sem caixas pendentes", description: "Nenhuma caixa pendente disponível agora.", variant: "default" });
                  } else if (next?.status === 409) {
                    toast({ title: "Conflito", description: "Outra estação pegou a caixa. Tente novamente.", variant: "warning" as any });
                  } else if (next?.status) {
                    toast({ title: "Erro", description: next?.errorData?.message || next?.error || "Falha ao reservar a próxima caixa.", variant: "destructive" });
                  }
                } catch (e: any) {
                  toast({ title: "Erro", description: e?.message || "Falha ao reservar a próxima caixa.", variant: "destructive" });
                }
              }}
            />
          ),
        }}
      />
    </div>
  );
}
