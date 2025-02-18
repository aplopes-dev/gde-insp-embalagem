import { DataTableViewOptions } from "@/components/data-table/components/data-table-view-options";
import { DataTableDateFilter } from "@/components/data-table/filters/data-table-date-filter";
import DataTableDebounceTextFilter from "@/components/data-table/filters/data-table-debounce-text-filter";
import { DataTableSelectFilter } from "@/components/data-table/filters/data-table-select-filter";
import { Button } from "@/components/ui/button";
import { Table } from "@tanstack/react-table";
import { XIcon } from "lucide-react";

interface BoxOpDataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function BoxOpDataTableToolbar<TData>({
  table,
}: BoxOpDataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex flex-col lg:flex-row justify-between">
      <div className="flex flex-1 flex-wrap gap-2">
        {table.getColumn("code") && (
          <DataTableDebounceTextFilter
            key={"code"}
            column={table.getColumn("code")}
            title="Código da embalagem"
            placeholder="Código da embalagem"
          />
        )}
        {/* {table.getColumn("status") && (
          <DataTableSelectFilter
            column={table.getColumn("status")}
            title="Status"
            placeholder="Status"
            notFoundMessage="Nenhum status encontrado"
            options={[
              {
                label: "Finalizado",
                value: "finish",
              },
              {
                label: "Com quebra",
                value: "broked",
              },
            ]}
          />
        )} */}
        {/* {table.getColumn("packedAt") && (
          <DataTableDateFilter
            column={table.getColumn("packedAt")}
            title="Embalado em"
            localeCode="ptBR"
          />
        )} */}
        {table.getColumn("packedAt") && (
          <DataTableDateFilter
            column={table.getColumn("packedAt")}
            title="Embalado em"
            localeCode="ptBR"
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters(true)}
            className="h-8 px-2 lg:px-3"
          >
            Limpar
            <XIcon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <DataTableViewOptions
          table={table}
          label="Colunas"
          toggleLabel="Colunas"
        />
      </div>
    </div>
  );
}
