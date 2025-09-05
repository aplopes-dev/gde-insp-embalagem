import { cn } from "@/shared/utils/tw-merge";
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
  pagination: { pageIndex: number; pageSize: number };
  pageCount: number;
  onPaginationChange: (updater: any) => void;
  sizes: number[];
};

export default function PaginationControl({
  pagination,
  pageCount,
  onPaginationChange,
  sizes,
}: PaginationControlProps) {
  const safePageCount = Math.max(1, pageCount || 1);
  const canPrev = pagination.pageIndex > 0;
  const canNext = pagination.pageIndex < safePageCount - 1;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            isActive={canPrev}
            onClick={() => onPaginationChange((p: any) => ({ ...p, pageIndex: 0 }))}
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
            isActive={canPrev}
            onClick={() =>
              onPaginationChange((p: any) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))
            }
          />
        </PaginationItem>
        <PaginationItem className="px-2">
          <span title="Página">
            {` ${pagination.pageIndex + 1} / ${safePageCount}`}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            aria-label="Próxima"
            title="Próxima"
            isActive={canNext}
            onClick={() =>
              onPaginationChange((p: any) => ({
                ...p,
                pageIndex: Math.min(safePageCount - 1, p.pageIndex + 1),
              }))
            }
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            isActive={canNext}
            onClick={() =>
              onPaginationChange((p: any) => ({ ...p, pageIndex: safePageCount - 1 }))
            }
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
            value={`${pagination.pageSize}`}
            onValueChange={(value) =>
              onPaginationChange((p: any) => ({
                ...p,
                pageSize: parseInt(value, 10),
                pageIndex: 0,
              }))
            }
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
