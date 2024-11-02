import { FilterClauseType } from "@/types/filter";
import { useState } from "react";

export function useFiltering(initialValue: FilterClauseType[] = []) {
  const [columnFilters, setColumnFiltering] = useState(initialValue);

  return {
    columnFilters,
    onColumnFiltersChange: setColumnFiltering,
  };
}
