import { useCallback, useState } from "react";

export function useSorting(initialField = "id", initialOrder = "ASC") {
  const [sorting, setSorting] = useState([
    { id: initialField, desc: initialOrder === "DESC" },
  ]);

  const onSortingChange = useCallback((updater: any) => {
    setSorting((prev: any) =>
      typeof updater === "function" ? updater(prev) : updater
    );
  }, []);

  return {
    sorting,
    onSortingChange,
    order: !sorting.length ? initialOrder : sorting[0].desc ? "DESC" : "ASC",
    field: sorting.length ? sorting[0].id : initialField,
  };
}
