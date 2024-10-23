"use client";

import { ServerDataTable } from "@/components/server-data-table";
import { useActionPageApi } from "@/hooks/use-action-page-api";
import { useFiltering } from "@/hooks/use-filtering";
import { usePagination } from "@/hooks/use-pagination";
import { useSorting } from "@/hooks/use-sorting";
import { useState } from "react";
import { getPaginatedBoxOp } from "../../actions";
import BlisterListDialog from "../blister-list-dialog";
import { useBoxOpColumns } from "./columns";
import { BoxOpDataTableToolbar } from "./toolbar";

export function DailyOpBoxTable({ opId }: { opId: number }) {
  const onCLickView = (value: any) => {
    setActiveKey(value);
    setOpenBlisterDialog(true);
  };

  const { columns } = useBoxOpColumns({ onCLickView });
  const { limit, onPaginationChange, skip, pagination } = usePagination(5);
  const { sorting, onSortingChange, field, order } = useSorting();
  const { columnFilters, onColumnFiltersChange } = useFiltering();

  const [activeKey, setActiveKey] = useState<any>(null);
  const [openBlisterDialog, setOpenBlisterDialog] = useState<boolean>(false);

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
          value: opId,
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
      <BlisterListDialog
        activeKey={activeKey}
        isOpen={openBlisterDialog}
        onOpenChange={setOpenBlisterDialog}
      />
    </div>
  );
}
