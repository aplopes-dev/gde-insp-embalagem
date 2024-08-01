"use client";

import { ServerDataTable } from "@/components/server-data-table";
import { useActionPageApi } from "@/hooks/use-action-page-api";
import { useFiltering } from "@/hooks/use-filtering";
import { usePagination } from "@/hooks/use-pagination";
import { useSorting } from "@/hooks/use-sorting";
import { getPaginatedBoxOp } from "../../actions";
import { useBoxOpColumns } from "./columns";
import { BoxOpDataTableToolbar } from "./toolbar";

export function DailyOpBoxTable() {
  const { columns } = useBoxOpColumns();

  const { limit, onPaginationChange, skip, pagination } = usePagination(5);
  const { sorting, onSortingChange, field, order } = useSorting();
  const { columnFilters, onColumnFiltersChange } = useFiltering();

  const [data, count, loading] = useActionPageApi({
    pagination: { skip, limit },
    sort: { field, order },
    filters: columnFilters,
    getAction: getPaginatedBoxOp,
  });

  const pageCount = Math.round((count as number) / limit);

  return (
    <ServerDataTable
      columns={columns}
      className="m-2 lg:m-4 xl:m-6 exl:m-10"
      data={data as any[]}
      // data={data as CategoryType[]}
      loading={loading}
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
  );
}
