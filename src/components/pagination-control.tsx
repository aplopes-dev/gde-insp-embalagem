import { cn } from "@/lib/utils";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type PaginationControlProps = {
  tableLib: any;
  sizes: number[];
};

export default function PaginationControl({
  tableLib,
  sizes,
}: PaginationControlProps) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            isActive={tableLib.getCanPreviousPage()}
            onClick={() => tableLib.setPageIndex(0)}
            aria-label="Página inicial"
            title="Página inicial"
            size="default"
            className={cn("gap-1 pl-2.5")}
          >
            <ChevronsLeft className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationPrevious
            aria-label="Anterior"
            title="Anterior"
            isActive={tableLib.getCanPreviousPage()}
            onClick={() => tableLib.previousPage()}
          />
        </PaginationItem>
        <PaginationItem className="px-2">
          <span title="Página">
            {` ${tableLib.getState().pagination.pageIndex + 1} / ${
              tableLib.getPageCount() > 0 ? tableLib.getPageCount() : 1
            }`}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            aria-label="Próxima"
            title="Próxima"
            isActive={tableLib.getCanNextPage()}
            onClick={() => tableLib.nextPage()}
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            isActive={tableLib.getCanNextPage()}
            onClick={() => tableLib.setPageIndex(tableLib.getPageCount() - 1)}
            aria-label="Última página"
            title="Última página"
            size="default"
            className={cn("gap-1 pl-2.5")}
          >
            <ChevronsRight className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <Select
            value={tableLib.getState().pageSize}
            onValueChange={(value) => tableLib.setPageSize(parseInt(value, 10))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Por página" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Por página</SelectLabel>
                {sizes.map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
