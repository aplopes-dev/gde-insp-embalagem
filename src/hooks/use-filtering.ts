import { useState } from "react";

export function useFiltering() {
  const [columnFilters, setColumnFiltering] = useState([]);

  return {
    columnFilters,
    onColumnFiltersChange: setColumnFiltering,
  };
}
