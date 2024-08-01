"use client";

import { DataTable } from "@/components/data-table";
import LoadingContent from "@/components/loading-content";
import PaginationControl from "@/components/pagination-control";
import {
  VisibilityState,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

const columnHelper = createColumnHelper();

type ServerDataTableProps = {
  columns: any[];
  data: any[];
  loading?: any;
  pageCount?: number;
  onPaginationChange: any;
  pagination: any;
  onSortingChange: any;
  sorting: any;
  onColumnFiltersChange: any;
  columnFilters: any;
  toolbare?: React.ComponentType<any>;
  childs?: {
    toolbar?: React.ComponentType<any>;
  };
  className?: string
};

export function ServerDataTable<TData, TValue>({
  columns,
  data,
  loading,
  pageCount,
  onPaginationChange,
  pagination,
  onSortingChange,
  sorting,
  onColumnFiltersChange,
  columnFilters,
  childs,
  className
}: ServerDataTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const cols = useMemo(
    () =>
      columns.map(
        ({ id, header, enableSorting, enableColumnFilter, meta, cell }) => ({
          ...columnHelper.accessor(id, {
            header,
            cell,
            meta,
          }),
          enableSorting,
          enableColumnFilter,
        })
      ),
    [columns]
  );

  const tableLib = useReactTable({
    data,
    columns: cols,
    state: {
      pagination,
      sorting,
      columnVisibility,
      columnFilters,
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
  });

  return (
    <LoadingContent className={className} loading={loading}>
      {childs?.toolbar && <childs.toolbar table={tableLib} />}
      <div className="rounded-md border mt-3">
        <DataTable tableLib={tableLib} columns={columns} />
      </div>
      <div className="w-full flex items-center justify-end space-x-2 py-4">
        <PaginationControl tableLib={tableLib} sizes={[5, 10, 20]} />
      </div>
    </LoadingContent>
  );
}
