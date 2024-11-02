"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Table as TanTable,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

interface DataTableProps<TData> {
  tableLib: TanTable<TData>;
  columns: any[];
  className?: string;
  noResultMessage?: string;
}

const columnHelper = createColumnHelper();

export function DataTable<TData>({
  tableLib,
  columns,
  className,
  noResultMessage = "",
}: DataTableProps<TData>) {
  return (
    <Table className={cn("", className)}>
      <TableHeader>
        {tableLib.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <TableHead
                  key={header.id}
                  {...(header.column.getCanSort()
                    ? { onClick: header.column.getToggleSortingHandler() }
                    : {})}
                >
                  <div className="flex items-center gap-1">
                    <div
                      className={
                        (header.column.columnDef.meta as any)?.className
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </div>
                    {header.column.getCanSort() &&
                      (header.column.getIsSorted() === "asc" ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronsUpDown className="w-4 h-4" />
                      ))}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {tableLib.getRowModel().rows?.length ? (
          tableLib.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {cell.column.columnDef.cell
                    ? flexRender(cell.column.columnDef.cell, cell.getContext())
                    : `${cell.getValue() || ''}`}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              {noResultMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
