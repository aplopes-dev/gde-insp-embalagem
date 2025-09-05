"use client";

import { ServerDataTable } from "@/components/server-data-table";
import { useActionPageApi } from "@/hooks/use-action-page-api";
import { useFiltering } from "@/hooks/use-filtering";
import { usePagination } from "@/hooks/use-pagination";
import { useSorting } from "@/hooks/use-sorting";
import { FilterPaginationParams } from "@/types/filter";
import { OpDto } from "@/types/op-dto";
import { useCallback, useMemo } from "react";
import { useBoxOpColumns } from "./columns";
import { OpListToolbar } from "./toolbar";

export default function DailyOpList() {
  const { columns: rawColumns } = useBoxOpColumns();
  const columns = useMemo(() => rawColumns, [rawColumns]);

  const { limit, onPaginationChange, skip, pagination } = usePagination(5);
  const { sorting, onSortingChange, field, order } = useSorting(
    "finishedAt",
    "DESC"
  );
  // Sem filtro default por instância; usuário escolhe via combobox
  const { columnFilters, onColumnFiltersChange } = useFiltering();

  const fetchPaginatedOp = useCallback(async (params: FilterPaginationParams) => {
    try {
      const queryParams = new URLSearchParams({
        limit: params.limit.toString(),
        skip: params.skip.toString(),
        field: params.field,
        order: params.order,
        filters: JSON.stringify(params.filters),
      });

      const res = await fetch(`/api/op?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar operações");

      const { data, count } = await res.json();
      return [data, count];
    } catch (error) {
      console.error(error);
      return [[], 0];
    }
  }, []);

  const [data, count, loading] = useActionPageApi({
    pagination: { skip, limit },
    sort: { field, order },
    filters: columnFilters,
    getAction: fetchPaginatedOp,
  });

  const pageCount = Math.max(1, Math.ceil((count as number) / limit));

  return (
    <ServerDataTable
      columns={columns}
      className="m-2 lg:m-4 xl:m-6 exl:m-10"
      data={data as OpDto[]}
      loading={loading}
      pageCount={pageCount}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      sorting={sorting}
      onSortingChange={onSortingChange}
      onColumnFiltersChange={onColumnFiltersChange}
      columnFilters={columnFilters}
      childs={{
        toolbar: OpListToolbar,
      }}
    />
  );
}
