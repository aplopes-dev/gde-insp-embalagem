import { FilterClauseType } from "@/types/filter";
import { useCallback, useState } from "react";

export function useFiltering(initialValue: FilterClauseType[] = []) {
  const [columnFilters, setColumnFiltering] = useState(initialValue);

  const onColumnFiltersChange = useCallback((updater: any) => {
    setColumnFiltering((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // evita updates quando o conteúdo não muda
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, []);

  return {
    columnFilters,
    onColumnFiltersChange,
  };
}
